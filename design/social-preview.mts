// Social preview image for GitHub (Settings, Social preview): `npx tsx design/social-preview.mts design/social-preview.png`, run in the project folder.
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
GlobalFonts.registerFromPath("assets/fonts/Fraunces_600SemiBold.ttf", "Fraunces");
GlobalFonts.registerFromPath("assets/fonts/SourceSans3_400Regular.ttf", "Source Sans 3");
const W = 1280, H = 640;
const c = createCanvas(W, H), g = c.getContext("2d");
g.fillStyle = "#f4efe6"; g.fillRect(0, 0, W, H);
g.fillStyle = "#b4532a"; g.fillRect(0, H - 14, W, 14);
const logo = await loadImage("design/logo/pult-logo.svg");
const lw = 400, lh = Math.round(lw * 212 / 390);
g.drawImage(logo, 100, 70, lw, lh);
g.fillStyle = "#23201b"; g.font = "600 54px Fraunces";
g.fillText("Der ruhige KI-Arbeitsplatz", 100, 355);
g.fillText("für Lehrkräfte.", 100, 422);
g.fillStyle = "#5b5348"; g.font = "30px 'Source Sans 3'";
g.fillText("Arbeitsblätter, Klausuren, Stundenplanung und mehr.", 100, 495);
g.fillText("Läuft auf deinem Computer. Open Source (Apache-2.0).", 100, 540);
writeFileSync(process.argv[2]!, c.toBuffer("image/png"));
