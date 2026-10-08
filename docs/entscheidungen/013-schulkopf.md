# 013: Schulkopf auf allem Material

Stand: 2026-10-08 · Issue #17

## Entscheidung

Eine Lehrkraft trägt in den Einstellungen (Reiter "Schule") **einmal** den Namen ihrer Schule ein und lädt ein Logo hoch. Beides steht danach im Kopf aller erzeugten Materialien, als PDF und als Word-Datei: Arbeitsblatt, Klausur, Erwartungshorizont, Lernsituation und Stundenverlauf. Ohne Eintrag bleibt alles wie bisher.

- **Das Programm setzt den Kopf, nicht das Modell.** Die Anleitungen (Skills) erwähnen ihn nicht, das Modell bekommt ihn nie zu sehen. Darum ändern sich die Prüfläufe nicht.
- **Ablage:** im Datenordner unter `Einstellungen/`: `Schule.md` (Name) und `Schullogo.png` (das gespeicherte Logo). Nicht im Repo.
- **Das Logo wird geprüft und neu gespeichert.** Erlaubt sind PNG, JPG und SVG bis 3 MB und 8000 Pixel Kantenlänge. Das Programm öffnet das Bild, rechnet es in Grau um (Durchsichtiges wird weiß), begrenzt es auf höchstens 800 x 260 Pixel und speichert ein neues PNG. Die Originaldatei wird nie aufbewahrt oder weitergegeben, Zusatzdaten (Metadaten) fallen damit weg.
- **SVG:** wird nur gezeichnet. Dateien mit Entitätsdeklarationen, Skripten oder Verweisen auf andere Dateien oder Adressen werden abgelehnt (Bilder in der Datei selbst als `data:` sind erlaubt). Ergebnis ist trotzdem immer ein PNG.
- **Bibliothek:** `@napi-rs/canvas` ist schon eingebunden (Schaubilder für Word, Lehrplan-PDF). Nichts Neues.
- **Kopf im PDF:** Logo in einer festen Box (44 x 13 mm, nie verzerrt, nie größer), daneben der Name in höchstens zwei Zeilen (lange Namen werden kleiner, zuletzt mit "…"), darunter eine dünne Linie. Er steht über der Kopfzeile mit Fach und Klasse und schiebt alles darunter nach unten, deshalb kann nichts überlappen. Er steht bei jedem Kopf eines Teils (bei der Lernsituation auch auf der Seite für die Lehrkraft).
- **Kopf in Word:** in der Kopfzeile der ersten Seite ("andere erste Seite"), Logo und Name nebeneinander. Die Fußzeile mit Seitenzahl steht auf allen Seiten.
- **Voreinstellung für den Probelauf:** nur Name und Logo, keine Adresse, keine Fußzeile.
- **Name:** höchstens 120 Zeichen, Zeilenumbrüche werden zu Leerzeichen.

## Hinweise in der Oberfläche (Pflicht)

"Nimm nur ein Logo, das deine Schule verwenden darf." und "Keine Fotos von Schülerinnen und Schülern." Die Rechte am Logo (Wappen, Träger) liegen bei der Lehrkraft.

## Grenzen

- **Word nicht in Word geprüft.** Die Struktur der Datei ist geprüft (andere erste Seite, Kopfzeile mit Bild und Name, Fußzeilen), aber weder Word noch LibreOffice standen zur Verfügung. Wie die Kopfzeile in Word aussieht, muss jemand öffnen.
- Stark komprimierte JPG-Dateien sehen in Grau schlecht aus. PNG oder SVG empfehlen (steht in der Oberfläche).
- Der Kopf erscheint in Word nur auf der ersten Seite, im PDF bei jedem Teil des Materials. Das ist gewollt (Kopf einer Seite mit Titel), kann bei mehrteiligem Material von Word abweichen.
- In `docs/ordnerstruktur.md` stehen `Schule.md` und `Schullogo.png` noch nicht. Die Datei gehört nicht zu den Dateien der Umsetzung, die Ergänzung steht als Vorschlag im PR.
