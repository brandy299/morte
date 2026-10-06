import type { Hono } from "hono";
import { listSkills, SkillError } from "../core/skills/index.ts";
import { deleteVorlage } from "../core/skills/personal.ts";

/** Templates (skills) as the teacher sees them: what they do, and which ones are her own. */
export function vorlagenRoutes(app: Hono) {
  app.get("/api/vorlagen", async (c) => {
    const { skills } = await listSkills();
    return c.json({ vorlagen: skills.map((s) => ({ name: s.name, titel: s.title, beschreibung: s.description, eigene: s.level === "persönlich" })) });
  });

  app.delete("/api/vorlagen/:name", async (c) => {
    try {
      await deleteVorlage(c.req.param("name"));
      return c.json({ ok: true });
    } catch (err) {
      if (err instanceof SkillError) return c.json({ error: err.message }, 400);
      throw err;
    }
  });
}
