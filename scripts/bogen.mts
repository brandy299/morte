// Writes the feedback sheet for the trial run: docs/probelauf-rueckmeldebogen.docx
import { writeFile } from "node:fs/promises";
import { rueckmeldebogenWord } from "../src/core/probelauf/bogen.ts";

const target = new URL("../docs/probelauf-rueckmeldebogen.docx", import.meta.url);
await writeFile(target, await rueckmeldebogenWord());
console.log(`Geschrieben: ${target.pathname}`);
