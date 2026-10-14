# Mitmachen bei Pult

Schön, dass du helfen willst. Pult ist ein kleines Projekt für Lehrkräfte ohne technischen Hintergrund, deshalb sind uns **einfache Sprache** und **Zuverlässigkeit** wichtiger als viele Funktionen.

## Fehler und Wünsche

Öffne ein [Issue](https://github.com/brandy299/morte/issues/new/choose). Bei einem Fehler hilft: Was hast du gemacht, was ist passiert, was hast du erwartet, **Version** (in Pult unten in den Einstellungen) und dein System (Windows oder Mac). **Gib keine Schülernamen, Noten oder Fotos von Klassenarbeiten an**, auch nicht in Gesprächsexporten.

## Änderungen vorschlagen

1. Lies [CLAUDE.md](CLAUDE.md) (die Arbeitsregeln) und die [README](README.md). Größere Dinge bitte erst als Issue besprechen.
2. Ein Thema pro Pull Request und pro Commit, kurze sachliche Commit-Nachrichten.
3. **Tests:** `npm test` und `npm run typecheck` müssen grün sein. Jede nicht triviale Logik bekommt einen Test, der fehlschlägt, wenn sie bricht.
4. **Sprache:** Texte in der Oberfläche, Meldungen und Dokumentation auf Deutsch in einfacher Sprache ohne Fachbegriffe. Code, Bezeichner und Code-Kommentare auf Englisch.
5. **Nicht verhandelbar:** keine Schülernamen, Noten oder Fotos von Klassenarbeiten (auch nicht in Beispielen, Tests und Logs), keine Schlüssel im Quelltext, keine KI-Anbieter fest verdrahten, nichts, was eine Zusatzinstallation außerhalb von Pult verlangt, kein Code aus Projekten mit unverträglicher Lizenz (vor allem AGPL).
6. Beschreibe im Pull Request, was du geprüft hast und was **nicht**.

Mit einem Beitrag stimmst du zu, dass er unter der [Apache-Lizenz 2.0](LICENSE) steht.
