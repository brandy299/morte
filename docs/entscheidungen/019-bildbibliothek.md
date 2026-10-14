# 019: Bildbibliothek für Bildschirmfotos, Pult liefert keine Bilder mit

Stand: 2026-10-11 · Grundlage: Issue #52 (Material für INWI mit echten Bildschirmfotos)

## Entscheidung

1. **Die Bilder gehören der Lehrkraft, nicht Pult.** Bildschirmfotos von Word, PowerPoint, Excel oder Access liegen im Ordner `Bilder/` im Arbeitsordner (`~/pult-daten/Bilder`). Im Repo (Apache-2.0) und im Programm liegen keine Microsoft-Bilder. Eine geteilte Bibliothek für mehrere Schulen kommt erst nach Klärung der Nutzungsbedingungen mit der Schulleitung.
2. **Ein Bild besteht aus zwei Dateien:** `<kennung>.png` und `<kennung>.json`. Die Beschreibung nennt Titel, Programm, Version, Sprache, Datum und die **Stellen im Bild** (Kennung, Name, Ort, Rechteck in Pixeln). Nur PNG, höchstens 8 MB und 5000 Pixel je Seite, höchstens 80 Stellen. Das Programm prüft alles beim Laden, ein kaputtes Bild wird gemeldet und stört die anderen nicht.
3. **Das Modell sieht nur Kennungen.** `bilder_suchen` listet Bilder und ihre Stellen (kein Internet, kein Pfad). Das Schaubild `bild` nimmt eine Bildkennung und Stellen daraus. Das Werkzeug lädt die Datei und gibt sie dem Layout, ein Modell kann kein eigenes Bild einschleusen. Gibt es kein passendes Bild, sagt das Modell es ehrlich und nimmt die Fenster-Skizze.
4. **Beschriftung liegt über dem Bild, nicht im Bild.** Dasselbe Bild dient für viele Aufgaben. Jede gewählte Stelle bekommt einen Rahmen mit Nummer (schwarz mit weißem Rand, damit er auf hellem und dunklem Grund steht und in Graustufen lesbar bleibt). Darunter steht die Liste „1 = Menüband“ oder ein leeres Feld, wo die Lernenden schreiben. Die Nummern sind die der Stellen in der Reihenfolge, nicht nur der leeren. Lösung und Wortliste laufen wie bei der Fenster-Skizze.
5. **Wo es geht:** Arbeitsblatt (PDF und Word), Präsentation (PowerPoint mit Bild und Rahmen als Objekte, Vorschau als PDF). Das Bild wird nie bearbeitet, gefiltert oder in einen Look gepackt (#53), damit es genau zeigt, was die Lernenden später sehen.

## Offen

- **Woher die Bilder und die Stellen kommen:** zunächst von Hand oder mit einem Agenten auf einem Rechner mit Office. Ob sich die Stellen aus den Bedienungshilfen von Windows und Mac automatisch auslesen lassen, ist eine Vermutung und wird an PowerPoint ausprobiert (#52).
- ~~Übung „Wo klickst du?“~~ ist gebaut (Schritt `klick` in der interaktiven Übung): Die Stellen sind die Trefferflächen und zugleich echte Schaltflächen (Tastatur, Vorlesen), drei Versuche, danach zeigt die Übung die Stelle. Der Klickpfad kommt aus dem Feld `ort` der Beschreibung, nicht vom Modell. Ein Bild liegt höchstens einmal in der Datei, höchstens drei Bilder und 12 MB je Übung. Klickpfade in Arbeitsblatt-Text und Bild in Word-Handouts mit Zuschnitt fehlen noch.
- Veraltete Bilder: Version und Datum stehen in der Beschreibung. Ein Hinweis bei nicht passender Version ist noch nicht gebaut.
