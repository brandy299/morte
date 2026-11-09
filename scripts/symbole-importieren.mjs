// Builds assets/symbole/symbole.json from a local copy of @tabler/icons (MIT): a hand-picked set for school use.
// Usage: node scripts/symbole-importieren.mjs /path/to/package   (the folder that holds icons/outline)
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Pfad zum entpackten @tabler/icons fehlt");

// id (file name) | German name | more words to find it by
const LISTE = `
droplet|Tropfen|wasser regen flüssigkeit
droplets|Tropfen (mehrere)|wasser regen
sun|Sonne|licht wärme sommer energie
moon|Mond|nacht
star|Stern|favorit bewertung
cloud|Wolke|wetter
cloud-rain|Regen|wetter niederschlag
cloud-snow|Schnee|wetter winter
snowflake|Schneeflocke|winter kälte
wind|Wind|luft wetter
flame|Feuer|flamme hitze verbrennung
bolt|Blitz|strom energie
leaf|Blatt|pflanze natur
plant|Pflanze|natur wachstum
plant-2|Pflanze mit Blättern|natur wachstum
trees|Bäume|wald natur
flower|Blume|blüte natur
mountain|Berg|gebirge landschaft
world|Welt|erde globus global
map|Karte|landkarte
map-pin|Ort|standort markierung
compass|Kompass|richtung navigation
home|Haus|zuhause wohnen
building|Gebäude|stadt
building-bank|Bank|geld finanzen
building-store|Geschäft|laden handel
building-factory-2|Fabrik|industrie produktion
building-skyscraper|Hochhaus|stadt
building-castle|Burg|mittelalter geschichte
building-monument|Denkmal|geschichte
school|Schule|bildung unterricht
book|Buch|lesen literatur
books|Bücher|bibliothek lesen
pencil|Stift|schreiben
ruler|Lineal|messen geometrie
ruler-2|Lineal quer|messen
calculator|Taschenrechner|rechnen mathe
abacus|Rechenrahmen|rechnen mathe
math-function|Funktion|mathe formel
math-symbols|Rechenzeichen|mathe plus minus
percentage|Prozent|mathe anteil
triangle|Dreieck|geometrie mathe
circle|Kreis|geometrie mathe
square|Quadrat|geometrie mathe
cube|Würfel|geometrie raum
chart-bar|Balkendiagramm|statistik zahlen
chart-pie|Kreisdiagramm|statistik anteile
chart-line|Liniendiagramm|statistik verlauf
trending-up|Anstieg|wachstum steigen
trending-down|Rückgang|sinken
clock|Uhr|zeit
hourglass|Sanduhr|zeit warten
calendar|Kalender|datum termin
user|Person|mensch
users|Gruppe|menschen team klasse
user-circle|Profil|person
heart|Herz|liebe gesundheit
heartbeat|Puls|herzschlag gesundheit
mood-smile|Lächeln|freude smiley
mood-sad|Traurig|smiley
brain|Gehirn|denken lernen
bulb|Glühbirne|idee licht
settings|Zahnrad|einstellung technik maschine
tool|Werkzeug|reparatur
hammer|Hammer|bauen handwerk
microscope|Mikroskop|biologie forschung
flask|Kolben|chemie labor experiment
test-pipe|Reagenzglas|chemie labor
atom|Atom|physik chemie
dna|Erbgut|dna biologie genetik
magnet|Magnet|physik
battery|Batterie|strom energie
plug|Stecker|strom
plug-connected|Stecker verbunden|strom
wifi|Funknetz|internet wlan
device-laptop|Laptop|computer
device-desktop|Computer|pc bildschirm
device-mobile|Handy|smartphone telefon
database|Datenbank|daten speicher
code|Programmieren|code informatik
mail|Brief|e-mail post
phone|Telefon|anruf
message|Nachricht|chat
message-circle|Sprechblase|gespräch kommunikation
speakerphone|Lautsprecher|ankündigung
news|Zeitung|nachrichten presse medien
file-text|Dokument|text datei
folder|Ordner|ablage
lock|Schloss|sicherheit
lock-open|Offenes Schloss|sicherheit
key|Schlüssel|zugang
shield|Schild|schutz sicherheit
scale|Waage|gerecht recht gleichgewicht
gavel|Richterhammer|gericht recht
flag|Flagge|land fahne
target|Zielscheibe|ziel
trophy|Pokal|sieg preis
medal|Medaille|preis
coin|Münze|geld
currency-euro|Euro|geld währung
cash|Geldschein|geld bargeld
credit-card|Karte|zahlung bank
shopping-cart|Einkaufswagen|einkauf handel
shopping-bag|Einkaufstasche|einkauf handel
receipt|Quittung|beleg rechnung
truck|Lastwagen|transport lieferung
car|Auto|verkehr
bus|Bus|verkehr
train|Zug|verkehr bahn
plane|Flugzeug|verkehr reise
ship|Schiff|verkehr see
bike|Fahrrad|verkehr
walk|Gehen|fußgänger bewegung
run|Laufen|sport bewegung
tractor|Traktor|landwirtschaft
apple|Apfel|obst ernährung
bread|Brot|ernährung
meat|Fleisch|ernährung
fish|Fisch|ernährung tier
egg|Ei|ernährung
cup|Tasse|trinken
bottle|Flasche|trinken
recycle|Recycling|kreislauf umwelt
trash|Mülleimer|abfall
gift|Geschenk|
music|Musik|noten
palette|Farbpalette|kunst malen
brush|Pinsel|kunst malen
camera|Kamera|foto
video|Film|video
headphones|Kopfhörer|hören
microphone|Mikrofon|sprechen aufnahme
eye|Auge|sehen
ear|Ohr|hören
hand-stop|Stopp|hand halt
thumb-up|Daumen hoch|gut zustimmung
thumb-down|Daumen runter|schlecht ablehnung
check|Haken|richtig erledigt
x|Kreuz|falsch schließen
question-mark|Fragezeichen|frage
exclamation-mark|Ausrufezeichen|wichtig achtung
alert-triangle|Warnung|achtung gefahr
info-circle|Info|hinweis
arrow-right|Pfeil rechts|weiter richtung
arrows-exchange|Austausch|tausch handel
refresh|Kreislauf|wiederholen
infinity|Unendlich|endlos
layers|Schichten|ebenen aufbau
puzzle|Puzzle|teile zusammenhang
link|Verbindung|kette
share|Teilen|weitergeben
search|Suche|lupe untersuchen
zoom-in|Vergrößern|lupe
stethoscope|Stethoskop|arzt medizin
pill|Tablette|medizin
first-aid-kit|Erste Hilfe|medizin
bandage|Verband|medizin
virus|Virus|krankheit
bug|Käfer|insekt tier
butterfly|Schmetterling|insekt tier
cat|Katze|tier
dog|Hund|tier
paw|Pfote|tier
bone|Knochen|körper skelett
skull|Totenkopf|gefahr
spider|Spinne|tier
feather|Feder|vogel schreiben
horse|Pferd|tier
swords|Schwerter|krieg kampf mittelalter
crown|Krone|könig herrschaft
planet|Planet|weltall astronomie
rocket|Rakete|weltall start
satellite|Satellit|weltall
telescope|Fernrohr|astronomie
language|Sprache|fremdsprache
abc|ABC|buchstaben schrift
typography|Schrift|buchstaben
number-1|Eins|zahl
certificate|Zeugnis|urkunde abschluss
award|Auszeichnung|preis
backpack|Rucksack|schule
chalkboard|Tafel|unterricht
presentation|Präsentation|folien vortrag
clipboard-check|Checkliste|aufgaben erledigt
list-check|Aufgabenliste|checkliste
notebook|Heft|notizen
writing|Schreiben|handschrift
quote|Zitat|anführungszeichen
balloon|Ballon|fest
wave-sine|Welle|schwingung physik
temperature|Temperatur|thermometer wärme
weight|Gewicht|masse
windmill|Windmühle|energie
solar-panel|Solarzelle|energie sonne
battery-charging|Laden|strom
bulldozer|Bagger|bau
road|Straße|verkehr
bridge|Brücke|bauwerk
tower|Turm|bauwerk
pyramid|Pyramide|ägypten geschichte
scroll|Schriftrolle|geschichte
trophy-off|Verloren|niederlage
handshake|Handschlag|einigung vertrag
heart-handshake|Zusammenhalt|hilfe
speakerphone|Ansage|lautsprecher
vaccine|Impfung|medizin
virus-search|Erreger suchen|medizin
world-www|Internet|web
shield-check|Geschützt|sicherheit datenschutz
fingerprint|Fingerabdruck|identität
id|Ausweis|identität
mood-kid|Kind|jung
old|Älterer Mensch|alt
baby-carriage|Kinderwagen|familie
ghost|Geist|
sword|Schwert|kampf
`.trim().split("\n");

const out = [];
const fehlt = [];
for (const zeile of LISTE) {
  const [id, de, tags = ""] = zeile.split("|");
  const file = join(root, "icons/outline", `${id}.svg`);
  if (!existsSync(file) || out.some((s) => s.id === id)) {
    if (!existsSync(file)) fehlt.push(id);
    continue;
  }
  const svg = readFileSync(file, "utf8");
  // Keep only the drawing: everything between the svg tags, without the empty bounding path.
  const d = svg.replace(/^[\s\S]*?>\s*/, "").replace(/<\/svg>\s*$/, "").replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>\s*/g, "").replace(/\s+/g, " ").trim();
  out.push({ id, de, tags: tags.trim(), d });
}
mkdirSync("assets/symbole", { recursive: true });
writeFileSync("assets/symbole/symbole.json", JSON.stringify(out) + "\n");
copyFileSync(join(root, "LICENSE"), "assets/symbole/LICENSE-Tabler.txt");
console.log(`${out.length} Symbole geschrieben. Nicht gefunden: ${fehlt.join(", ") || "-"}`);
