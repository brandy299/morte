# Entscheidung 002: Alles bleibt in der App, PDFs ohne Zusatzprogramm

Datum: 2026-10-05 · Status: angenommen (Vorgabe von Yannik)

## Anlass

Kolleginnen und Kollegen sollen nichts außer morte selbst installieren müssen. Der erste Entwurf für die PDF-Erzeugung (HTML-Vorlage über Playwright) hätte einen zusätzlichen Chromium-Browser verlangt (`npx playwright install chromium`, rund 150 MB).

## Entscheidung

- **Regel:** Alles, was morte zum Arbeiten braucht, steckt in der App. Es gibt keine Zusatzinstallation und keine Einrichtung außerhalb von morte. Das gilt auch für spätere Funktionen.
- **PDF:** Wird direkt in der App gezeichnet mit `pdfkit` (reines Node, Lizenz MIT). Das Layout liegt fest im Code (`src/core/material/`), das Modell liefert nur den Inhalt.
- **Playwright** ist wieder entfernt.

## Folgen

- Die Schriften sind vorerst die eingebauten von pdfkit (Times, Helvetica). Sie kennen nur westeuropäische Zeichen (Windows-1252). Anderes (zum Beispiel türkische oder polnische Sonderbuchstaben) wird als "?" gedruckt. Abhilfe: eine freie Schrift (SIL OFL) in der App mitliefern und einbetten. Offen, bis eine Schrift gewählt ist.
- Erklärvideos (Phase 5) brauchen einen Browser zum Rendern. In der Electron-Verpackung (Phase 6) ist Chromium schon enthalten. Bis dahin bleibt das Video-Thema offen, es darf keine Zusatzinstallation verlangen.
- Native Bausteine wie `@napi-rs/keyring` kommen fertig gebaut mit dem npm-Paket. Wo der Schlüsselbund fehlt, gibt es den Rückfall auf eine Datei.
