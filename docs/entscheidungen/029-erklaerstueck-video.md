# 029: Erklärstück als Video (MP4), Bild für Bild aus der Vorschau

Stand: 2026-11-10 · setzt Entscheidung 017 um, Entscheidung 028 (neuer Aufbau) ist die Grundlage

## Entscheidung

1. **In der Vorschau eines Erklärstücks gibt es „Als Video“.** Das Ergebnis ist eine MP4-Datei, 1280 × 720, 30 Bilder pro Sekunde, **ohne Ton**. Fortschritt in Prozent und „Abbrechen“ stehen am Knopf.
2. **Die Seite liefert die Bilder, Pult setzt das Video zusammen.** Die Vorschau fragt die Seite (im Schutzraum, `sandbox="allow-scripts"`, per `postMessage`) nach der Gesamtdauer und dann nach einem Bild je Zeitpunkt. Die Seite springt mit `seek(ms)` an die Stelle und schickt sich selbst als SVG-Bild zurück (`foreignObject`, immer 1280 × 720, egal wie groß das Fenster ist; die Steuerknöpfe fehlen, ein bewegter Hintergrund kommt als Bild mit). Die Oberfläche zeichnet es auf eine Fläche, der Kodierer des Browsers (WebCodecs) macht daraus Bilder, Mediabunny (MPL-2.0, unverändert benutzt, Version gepinnt) setzt die MP4-Datei zusammen. Gleiche Bilder in Folge werden nur einmal gezeichnet.
3. **Keine Änderung an der Electron-Hülle.** Alles läuft in der Oberfläche, ein Update über den Knopf in der App genügt, niemand muss neu installieren. Nichts verlässt den Rechner, es braucht kein Zusatzprogramm (Entscheidung 002).
4. **Kodierer:** H.264, wo der Rechner es kann; sonst VP9 in derselben MP4-Datei (Mediabunny wählt den ersten möglichen). Ohne beides erscheint eine Meldung in einfacher Sprache.
5. **Ton:** Standard ohne Stimme (CLAUDE.md). Musik gibt es noch nicht; sie braucht eine Quelle mit passender Lizenz und kommt erst, wenn die entschieden ist.
6. **Nicht gewählt:** Ein Hilfsfenster im Hauptprogramm von Electron mit `capturePage()` pro Bild (bräuchte eine Änderung an der Hülle und damit eine Neuinstallation bei den Testern); ein Browser auf dem Server (verstößt gegen „alles in der App“).

## Geprüft

- Echter Lauf in Chromium mit dem Code aus `src/web/video.ts` und einer Seite im Schutzraum eines kleineren Fensters (900 × 520): 13,8 s Video, 414 Bilder, H.264, 1280 × 720, rund 48 s Rechenzeit ohne Grafikkarte (etwa das 3,5-Fache der Spieldauer). Bilder bei 6 s und 12,5 s angesehen: Schrift, Symbol, Hintergrund stimmen mit der Vorschau überein.
- Tests: Zeitpunkte des Videos (`src/web/video.test.ts`), Bild auf Anfrage im echten Browser (immer 1280 × 720, gleich in einem kleinen Fenster, ohne Skript und Steuerung, Hintergrund als Bild), Dauer (`src/core/animation`).

## Offen

- H.264 im Kodierer von Electron auf Mac und Windows (hier nur Chromium unter Linux). Sonst VP9.
- Rechenzeit auf einem Lehrer-Laptop. Die Anzeige verspricht keine Dauer.
- „Weniger Bewegung“ am Gerät: Die Seite bewegt sich dann nicht, das Video wird mit einer Meldung abgelehnt.
- Musik (siehe oben), Moodle, Safari, Firefox, Edge.
- Beim Zurückspringen bleiben an Teilen kleine Stilreste stehen (sieht gleich aus, ist aber nicht Zeichen für Zeichen gleich). Beim Export wird nur vorwärts gesprungen, daher ohne Folge.
