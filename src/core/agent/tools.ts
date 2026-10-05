import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";

/**
 * Fixed, teacher-specific tools only. No shell, no free file access.
 * `label` is German and shown in the progress display.
 */
export const dateTool: AgentTool = {
  name: "datum_heute",
  label: "Datum nachsehen",
  description: "Returns today's date and weekday in German. Use it when the date matters.",
  parameters: Type.Object({}),
  async execute() {
    const text = new Intl.DateTimeFormat("de-DE", {
      dateStyle: "full",
      timeZone: "Europe/Berlin",
    }).format(new Date());
    return { content: [{ type: "text", text }], details: undefined };
  },
};

export const tools: AgentTool[] = [dateTool];
