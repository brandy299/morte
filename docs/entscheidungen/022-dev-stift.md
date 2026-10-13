# 022: Dev-Stift: Hinweise direkt auf der Oberfläche, nur für die Testphase

Stand: 2026-10-14 · Idee aus dem Harness-Vortrag (eigene Rückmeldung am Bildschirm), Issue #60 ist die spätere Fassung für Lehrkräfte

## Entscheidung

1. **Ein Stift-Knopf unten links, nur für Yannik beim Testen.** Er erscheint nur, wenn der Server mit `npm start -- --stift` (oder `PULT_STIFT=1`) gestartet wurde. Eine Lehrkraft sieht ihn nie.
2. **Markieren und beschreiben:** Klick auf ein Element oder einen Bereich aufziehen, einen Text schreiben, speichern. Die Klicks gehen nicht an die Oberfläche durch, solange der Stift aktiv ist. Esc bricht ab.
3. **Gespeichert wird in `Dev-Hinweise/` im Arbeitsordner**, nichts wird gesendet. Zu jedem Hinweis gehören: die Notiz, die Ansicht (Überschriften, Adresse, Fenstergröße), das Ziel mit Rechteck und, bei einem Element, der **kurze CSS-Pfad** (`div.rueckmeldung > button.rueck-knopf:nth-of-type(2)`), der Text und die Beschriftung des Elements. Damit finde ich die Stelle im Code, ohne zu raten.
4. **Optional ein Bildschirmfoto der Seite** (Häkchen), über die Bildschirmaufnahme des Browsers (der Browser fragt jedes Mal). Ohne Erlaubnis wird der Hinweis ohne Bild gespeichert und das steht dabei.
5. **Weitergeben:** „Alle als ZIP“ (Text plus Bilder) oder „Alle als Text“ aus dem Stift-Fenster. Die Datei kommt in den Chat. Hinweise lassen sich löschen.
6. **Grenzen:** Notiz höchstens 1500 Zeichen, Bild höchstens 3 MB (PNG), höchstens 300 Hinweise. Der Server prüft alles und lehnt Kaputtes mit einer Meldung ab. Die Wege (`/api/stift`) antworten nur, wenn der Stift eingeschaltet ist.

## Nicht gebaut

- Zeichnen mit der Maus im Bild (Pfeile, Kringel), Hinweise an Antworten des Assistenten, Schicken über das Netz.
- Eine Fassung für Lehrkräfte (Issue #60). Sie braucht die Entscheidung, was im Export stehen darf (Datenschutz), und eine Bedienung für Menschen ohne technischen Hintergrund.

## Datenschutz

Beim Testen liegen darin nur Notizen und Bildschirmfotos der Oberfläche. Wer beim Testen echte Namen oder Klassenarbeiten auf dem Bildschirm hat, schaltet das Bildschirmfoto aus. Der Hinweis im Stift-Fenster sagt es nicht ausdrücklich, weil es ein Entwicklerwerkzeug ist: Testdaten sind erfunden (CLAUDE.md).
