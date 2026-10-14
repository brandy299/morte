// Builds the guides as single HTML files in the project folder: `npm run anleitung`.
import { writeFileSync } from "node:fs";
import { anleitungenBauen } from "../src/release/anleitungen.ts";

for (const a of anleitungenBauen()) {
  writeFileSync(a.ziel, a.data);
  console.log(`Fertig: ${a.ziel}`);
}
