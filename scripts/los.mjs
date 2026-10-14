// Starts Pult for people who do not use a terminal: sets everything up on the first run, starts the server, opens the browser.
// Called by "Pult starten.bat" (Windows) and "Pult starten.command" (Mac). Only Node built-ins here, because it runs before `npm install`.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 3001);
const url = `http://localhost:${port}`;
const win = process.platform === "win32";

const say = (text = "") => console.log(text);
const fail = (text) => {
  say();
  say(text);
  say();
  process.exit(1);
};

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) fail(`Dein Node.js ist zu alt (Version ${process.versions.node}). Pult braucht Version 22 oder neuer.\nLade auf https://nodejs.org die Version „LTS“ herunter und installiere sie. Dann starte Pult noch einmal.`);

/** Runs `npm <args>` in the Pult folder and shows its output. */
function npm(args) {
  return spawnSync("npm", args, { cwd: root, stdio: "inherit", shell: win }).status === 0;
}

// The stamp remembers which package-lock.json the installed packages belong to, so an update with new libraries installs them too.
const lockHash = () => {
  try {
    return createHash("sha256").update(readFileSync(join(root, "package-lock.json"))).digest("hex");
  } catch {
    return "";
  }
};
const stamp = join(root, "node_modules", ".pult-lock");
const installed = () => {
  try {
    return readFileSync(stamp, "utf8").trim();
  } catch {
    return "";
  }
};

const firstRun = !existsSync(join(root, "node_modules"));
if (firstRun || installed() !== lockHash()) {
  say(firstRun ? "Beim ersten Start richtet sich Pult ein. Das dauert zwei bis fünf Minuten." : "Pult holt noch ein paar neue Teile. Das dauert einen Moment.");
  say("Es laufen viele Zeilen durch, auch gelbe Warnungen. Das ist normal. Bitte warte, bis es weitergeht.");
  say();
  if (!npm(["install", "--no-audit", "--no-fund"])) {
    fail("Die Einrichtung hat nicht geklappt. Prüfe deine Internetverbindung und starte noch einmal.\nHilft das nicht, mach ein Foto von den ersten roten Zeilen oben und schick es an Yannik.");
  }
  try {
    writeFileSync(stamp, lockHash());
  } catch {
    // Without the stamp the next start only runs the (quick) install again.
  }
}

if (!existsSync(join(root, "dist", "web", "index.html"))) {
  say("Pult baut die Oberfläche auf. Das dauert etwa eine Minute.");
  if (!npm(["run", "build"])) fail("Der Aufbau hat nicht geklappt. Mach ein Foto von den roten Zeilen oben und schick es an Yannik.");
}

// The guides as single HTML files next to the program, built from docs/ when the package did not bring them. Best effort.
if (!existsSync(join(root, "Anleitung.html")) && existsSync(join(root, "docs", "anleitung-tester.md"))) npm(["run", "anleitung", "--silent"]);

const server = spawn(process.execPath, [join(root, "scripts", "start.mjs")], { cwd: root, stdio: "inherit" });
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

/** Waits until the server answers, then opens the browser. Gives up quietly after a minute. */
async function openWhenReady() {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(url);
      say();
      say(`Pult läuft. Der Browser öffnet sich gleich (${url}).`);
      say("Lass dieses Fenster offen, solange du mit Pult arbeitest. Zum Beenden schließe es.");
      const [cmd, args] = win ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
      spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => say(`Öffne bitte selbst im Browser: ${url}`)).unref();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
openWhenReady();

server.on("exit", (code) => {
  if (code) fail(`Pult wurde beendet (Fehler ${code}). Läuft Pult schon in einem anderen Fenster? Schließe es und versuche es noch einmal.`);
  process.exit(0);
});
