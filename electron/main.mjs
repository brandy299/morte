// Pult as a desktop app. The window shows the same page as in the browser; the server runs next to it as a child process
// (the Electron program started as plain Node.js), exactly as `npm start` does. Nothing is installed besides this app.
import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from "electron";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The program as installed. Updates from inside the app put newer code in `<app data>/code/aktuell`; it is used as long as
// it was made for this very program (same libraries and shell, same installed version) and starts. Otherwise the installed code runs.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsx = createRequire(join(root, "package.json")).resolve("tsx/cli");
const codeDir = join(app.getPath("userData"), "code");
const override = join(codeDir, "aktuell");
const read = (p) => {
  try {
    return readFileSync(p, "utf8").trim();
  } catch {
    return "";
  }
};
const huelle = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).pultHuelle ?? 0;
// Must be computed exactly as in scripts/code-paket.mjs.
const basis = createHash("sha256").update(readFileSync(join(root, "package-lock.json"))).update(`\n${huelle}`).digest("hex");
const useOverride = () => existsSync(override) && read(join(override, ".basis")) === `${basis}/${app.getVersion()}`;
let codeRoot = root;
// A fixed address, so settings kept by the page (look, drafts) stay between starts. Another one only if this one is taken.
const WISH_PORT = Number(process.env.PULT_PORT ?? 38517);

let server;
let origin = "";
let quitting = false;

const say = (title, text) => dialog.showErrorBox(title, text);

function freePort(wish) {
  return new Promise((done) => {
    const probe = createServer();
    probe.once("error", () => {
      const any = createServer();
      any.listen(0, "127.0.0.1", () => {
        const { port } = any.address();
        any.close(() => done(port));
      });
    });
    probe.listen(wish, "127.0.0.1", () => probe.close(() => done(wish)));
  });
}

async function waitForServer(port) {
  for (let i = 0; i < 240; i++) {
    if (!server || server.exitCode !== null) return false;
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/setup/status`)).ok) return true;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function startServer(port) {
  codeRoot = useOverride() ? override : root;
  server = spawn(process.execPath, [tsx, "src/server/index.ts"], {
    cwd: codeRoot,
    windowsHide: true,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PULT_APP: "1", PULT_BASIS: basis, PULT_APP_VERSION: app.getVersion(), PULT_CODE_DIR: codeDir, PULT_NODE_MODULES: join(root, "node_modules"), PORT: String(port), NODE_USE_SYSTEM_CA: "1", NODE_USE_ENV_PROXY: "1", NODE_OPTIONS: "--disable-warning=UNDICI-EHPA" },
  });
  const mine = server;
  server.on("exit", async (code) => {
    if (server !== mine) return;
    // Exit code 75: an update put new code in place. Start from it and load the page again.
    if (code === 75 && !quitting) {
      startServer(port);
      if (await waitForServer(port)) BrowserWindow.getAllWindows().forEach((w) => w.loadURL(origin));
      else if (await fallBack(port)) BrowserWindow.getAllWindows().forEach((w) => w.loadURL(origin));
      return;
    }
    if (!quitting) {
      say("Pult wurde beendet", "Pult ist unerwartet angehalten worden. Bitte starte es noch einmal. Hilft das nicht, schick ein Foto dieser Meldung an Yannik.");
      app.quit();
    }
  });
}

/** New code that does not start is thrown away; the installed code takes over again. True when the server then answers. */
async function fallBack(port) {
  server?.kill();
  rmSync(override, { recursive: true, force: true });
  startServer(port);
  return waitForServer(port);
}

function openWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Pult",
    backgroundColor: "#f6f1e8",
    webPreferences: { preload: join(root, "electron", "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL(origin);
  // Links to other sites open in the normal browser, never inside Pult.
  const external = (url) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) return { action: "allow" };
    external(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      external(url);
    }
  });
  return win;
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    const port = await freePort(WISH_PORT);
    origin = `http://127.0.0.1:${port}`;
    startServer(port);

    // Only Pult's own page may use the microphone (dictation) and notifications.
    session.defaultSession.setPermissionRequestHandler((wc, permission, ok) => ok(wc.getURL().startsWith(origin) && ["media", "notifications", "clipboard-sanitized-write"].includes(permission)));
    // The folder dialog is opened only for Pult's own page.
    ipcMain.handle("ordner-waehlen", async (event) => {
      if (!event.senderFrame?.url.startsWith(origin)) return null;
      const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
      const result = await dialog.showOpenDialog(win, { title: "In welchem Ordner sollen wir arbeiten?", properties: ["openDirectory", "createDirectory"] });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    });

    if (!(await waitForServer(port)) && !(codeRoot === override && (await fallBack(port)))) {
      say("Pult startet nicht", "Pult konnte nicht starten. Bitte starte es noch einmal. Hilft das nicht, schick ein Foto dieser Meldung an Yannik.");
      app.quit();
      return;
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
      { role: "editMenu" },
      { label: "Ansicht", submenu: [{ role: "reload", label: "Neu laden" }, { role: "togglefullscreen", label: "Vollbild" }, { role: "zoomIn", label: "Größer" }, { role: "zoomOut", label: "Kleiner" }, { role: "resetZoom", label: "Normale Größe" }] },
      { role: "windowMenu" },
    ]));
    openWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) openWindow();
    });
  });

  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    quitting = true;
    server?.kill();
  });
}
