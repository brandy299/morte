# Entscheidung 002: Alles bleibt in der App, PDFs ohne Zusatzprogramm

Datum: 2026-10-05 · Status: angenommen (Vorgabe von Yannik)

## Anlass

Kolleginnen und Kollegen sollen nichts außer morte selbst installieren müssen. Der erste Entwurf für die PDF-Erzeugung (HTML-Vorlage über Playwright) hätte einen zusätzlichen Chromium-Browser verlangt (`npx playwright install chromium`, rund 150 MB).

## Entscheidung

- **Regel:** Alles, was morte zum Arbeiten braucht, steckt in der App. Es gibt keine Zusatzinstallation und keine Einrichtung außerhalb von morte. Das gilt auch für spätere Funktionen.
- **PDF:** Wird direkt in der App gezeichnet mit `pdfkit` (reines Node, Lizenz MIT). Das Layout liegt fest im Code (`src/core/material/`), das Modell liefert nur den Inhalt.
- **Playwright** ist wieder entfernt.

## Folgen

- **Schriften:** Statt der eingebauten pdfkit-Schriften (nur westeuropäische Zeichen) liefert morte zwei freie Schriften mit (SIL OFL): Fraunces für Titel und Source Sans 3 für Text, siehe `assets/fonts/NOTICE.md`. Sie gelten für PDF und Oberfläche, es wird nichts aus dem Netz geladen. Zeichen, die keine der beiden kann (zum Beispiel Emoji), werden als "?" gedruckt.
- Erklärvideos (Phase 5) brauchen einen Browser zum Rendern. In der Electron-Verpackung (Phase 6) ist Chromium schon enthalten. Bis dahin bleibt das Video-Thema offen, es darf keine Zusatzinstallation verlangen.
- Native Bausteine wie `@napi-rs/keyring` kommen fertig gebaut mit dem npm-Paket. Wo der Schlüsselbund fehlt, gibt es den Rückfall auf eine Datei.
