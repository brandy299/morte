import type { Hono } from "hono";
import { checkUpdate, startUpdate, UpdateError } from "../core/update/index.ts";
import { updateFortschritt } from "../core/update/app.ts";

/** Update button in the settings: look up the newest version, and replace the program files. */
export function updateRoutes(app: Hono) {
  app.get("/api/update", async (c) => c.json(await checkUpdate()));

  // Progress of a running update, polled by the progress display.
  app.get("/api/update/fortschritt", (c) => c.json(updateFortschritt() ?? null));

  app.post("/api/update/start", async (c) => {
    let danach: Awaited<ReturnType<typeof startUpdate>>;
    try {
      danach = await startUpdate();
    } catch (err) {
      if (err instanceof UpdateError) return c.json({ error: err.message }, 400);
      // Anything else is a technical problem: say it in one line so it can be passed on.
      console.error("Update:", err);
      return c.json({ error: `Das Aktualisieren hat nicht geklappt. Nenne bitte diese Zeile: ${err instanceof Error ? err.message : String(err)}` }, 500);
    }
    // The updater waits until this server is gone, then swaps the files. The answer must be out first.
    // In the desktop app the code is already swapped; exit code 75 tells the app to start the server again from the new code.
    // Exit code 77: the whole program is replaced, the app closes (a helper installs it and starts Pult again).
    setTimeout(() => process.exit(danach === "beenden" ? 77 : process.env.PULT_APP === "1" ? 75 : 0), 500);
    return c.json({ ok: true });
  });
}
