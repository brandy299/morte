import type { Hono } from "hono";
import { checkUpdate, startUpdate, UpdateError } from "../core/update/index.ts";

/** Update button in the settings: look up the newest version, and replace the program files. */
export function updateRoutes(app: Hono) {
  app.get("/api/update", async (c) => c.json(await checkUpdate()));

  app.post("/api/update/start", async (c) => {
    try {
      await startUpdate();
    } catch (err) {
      if (err instanceof UpdateError) return c.json({ error: err.message }, 400);
      throw err;
    }
    // The updater waits until this server is gone, then swaps the files. The answer must be out first.
    setTimeout(() => process.exit(0), 500);
    return c.json({ ok: true });
  });
}
