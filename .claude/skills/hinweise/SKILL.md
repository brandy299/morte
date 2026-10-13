---
name: hinweise
description: Liest die Hinweise, die Yannik mit dem Dev-Stift in Pult gemacht hat (Ordner Dev-Hinweise), und setzt sie um. Nutze es bei "setz meine Hinweise um", "lies die Stift-Hinweise", "arbeite die Hinweise ab", "/hinweise". Nur für die Entwicklung, nicht für Lehrkräfte.
---

# Hinweise aus dem Dev-Stift umsetzen

Yannik testet Pult lokal mit `npm start -- --stift`, markiert Stellen auf der Oberfläche und schreibt dazu, was anders sein soll. Das landet im Arbeitsordner von Pult. Du liest es von der Platte (kein Hochladen nötig) und setzt es um. Das ist der schnelle Kreislauf: markieren, umsetzen lassen, wieder ansehen.

## Ablauf

1. **Ordner finden.** `Dev-Hinweise` liegt im Arbeitsordner von Pult: `$PULT_HOME/Dev-Hinweise`, sonst `~/pult-daten/Dev-Hinweise`. Frag Yannik nach dem Ordner, wenn er dort nicht liegt. Lies nur dort, nirgends sonst im Arbeitsordner (Klassen, Gespräche und Lehrpläne gehen dich nichts an).
2. **Hinweise lesen.** Jeder Hinweis ist `<kennung>.json`, dazu optional `<kennung>.png`. Im JSON stehen die Notiz, die Ansicht (Überschriften, Fenstergröße), das Ziel (`selektor`, Text, Beschriftung, Rechteck) und der Zeitpunkt. Sieh dir das Bild an, wenn es eins gibt. Sortiere nach `zeit`.
3. **Stelle im Code finden.** Der `selektor` ist ein kurzer CSS-Pfad (`aside.side > button.new-chat`). Suche die Klassen in `src/web/` (`grep` nach dem Klassennamen in `styles.css` und `*.tsx`). Bei einem Bereich ohne Selektor hilft die Ansicht (Überschriften) und das Bild.
4. **Eins nach dem anderen umsetzen.** Pro Hinweis die kleinste richtige Änderung (Regeln aus `CLAUDE.md`: erst prüfen, dann bauen, Ursache statt Symptom). Ist ein Hinweis unklar oder braucht eine Entscheidung, frag Yannik, statt zu raten. Mehrere Hinweise zum selben Thema gehören in einen Commit, ein Thema pro Commit.
5. **Ansehen.** Bei Oberflächenänderungen die App starten (`npm start -- --stift`, `npx vite build` vorher) und mit Playwright ansehen, bevor du „fertig“ sagst. Tests und `tsc` müssen laufen.
6. **Aufräumen nur mit Yanniks Ja.** Erledigte Hinweise (JSON und PNG) löscht du erst, wenn er sie gesehen und bestätigt hat. Zeig ihm vorher eine Liste: Hinweis, was geändert wurde, Commit.

## Regeln

- Texte in der Oberfläche auf Deutsch in einfacher Sprache, Code und Kommentare auf Englisch.
- Keine Namen von Lernenden, keine Noten, kein Inhalt von Klassenarbeiten in Commits oder Antworten. Beim Zitieren eines Hinweises nur zitieren, was für die Änderung nötig ist.
- Der Stift selbst (`src/web/Stift.tsx`) ist ein Entwicklerwerkzeug. Ändere ihn nur, wenn ein Hinweis ihn betrifft.
