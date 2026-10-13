# 021: Harness-Karte: Wie Pult die acht Bausteine eines Harness umsetzt

Stand: 2026-10-13 · Grundlage: Vortrag „Harness Engineering“ (Austin Marchese, 2026) und die Prüfung dieses Vortrags (Transkript und Gegenlesen liegen bei Yannik)

## Entscheidung

1. **Pult ist Yanniks Harness für die Unterrichtsvorbereitung.** Das Modell ist austauschbar (Entscheidung 001), alles andere ist unsere Arbeit. Wir bauen auf dem auf, was da ist, und erfinden nichts neu.
2. **Pult baut seinen eigenen Agentenkern, statt auf einem Basis-Harness wie Claude Code aufzusetzen.** Der Vortrag empfiehlt das Aufsetzen. Bei uns geht es nicht: Lehrkräfte installieren nichts außer Pult (002), jedes zugelassene Modell muss laufen (014), und der Agent bekommt keine freie Shell. Was ein Basis-Harness mitbringt (Schleife, Werkzeugaufruf, Gedächtnis), kommt aus pi (001).
3. **Unterscheidung nach der Prüfung des Vortrags (Böckeler): Führen und Prüfen.** Die acht Bausteine des Vortrags kennen nur „Regeln führen das Modell“ und „der Nutzer meldet zurück“. Fehlt: **Sensoren**, also Prüfungen, die das Modell **selbst zurückbekommt**, sodass es nachbessert. Bei Pult sind Sensoren der wichtigste Teil und kosten nichts im Gespräch: Ohne Prüfbarkeit gibt es keine Verbesserung.
4. **Ein Baustein nach dem anderen, Regeln erst nach dem ersten Fehler.** Keine Regelsammlung auf Vorrat (steht schon in `CLAUDE.md`: „Nichts auf Vorrat“).

## Die Karte

| Baustein | Bei Pult | Art | Stand |
|---|---|---|---|
| Regeln | Systemtext (`session.ts`), Datenschutz- und Materialregeln, Sperrliste | führt | da |
| Skills | `skills/` (13 Anleitungen), eigene Vorlagen der Lehrkraft | führt | da |
| Kontext | `Klasse.md`, `Stand.md`, `Reihe.md`, Lehrplan, Bildbibliothek | führt | Wissensordner offen (#56) |
| Verbindungen (MCP) | bewusst keine, nur feste Werkzeuge | | später geprüfte Anschlüsse (Moodle) |
| Hooks | `beforeToolCall`: Rückfrage vor Ändern und Löschen | prüft | da |
| Sensoren, im Gespräch | jede Eingabeprüfung (`parse*`) mit Meldung in einfacher Sprache, die das Modell zurückbekommt („Folie 2 hat zu viel Text“, „Es fehlt: …“), `materialLuecken`, Verbindungstest, Sperrliste | prüft | da, größter Teil der Qualität |
| Sensoren, beim Bauen | `npm run eval` (Programm- und Prüferkriterien), Jev-Vortest, Tests, CI | prüft | da |
| Unteragenten | bewusst keine (Entscheidung zum zentralen Agenten); beim Bauen der Haiku-Helfer | | beabsichtigt |
| Oberfläche | lokale Web-Oberfläche, später Electron | | da, wird überarbeitet |
| Rückmeldung der Lehrkraft | „Passt“ / „Passt nicht“ (020) | Rückkopplung | da |

## Was daraus folgt

- **Neue Funktion heißt: erst den Sensor.** Vor dem Schreiben einer Anleitung fragen: Woran merkt Pult, dass es falsch ist? Gibt es keine Antwort, braucht es zuerst eine Prüfung (an der Grenze des Werkzeugs, in `evals/`) und erst dann mehr Text für das Modell.
- **Meldungen der Sensoren sagen, was zu ändern ist.** Sie sind die Rückmeldung an das Modell. Das gilt für jedes neue Werkzeug und ist in den Prüfungen von Erklärstück, Übung und Bildbibliothek so umgesetzt.
- **Lücke bei den Sensoren im Gespräch:** Das fertige Material wird bisher nur dort geprüft, wo das Werkzeug es ablehnt. Eine Prüfung der **fertigen Datei** (leere Seiten, Seitenzahl gegenüber dem Wunsch, Beschriftung außerhalb des Bildes) und eine Meldung an das Modell wäre der nächste Baustein. Nicht gebaut, braucht zuerst Fälle aus den Rückmeldungen.
- **Oberfläche:** Eine Zustandszeile fürs Wissen („6 Dateien, zuletzt aufgefrischt vor 2 Minuten“, Knopf), ein `/`-Menü mit allen Anleitungen und je einer Zeile dazu, und ein Bereich „Anpassen“ für Anleitungen, Regeln, Wissen und Rückmeldungen stehen als nächste Oberflächenschritte an. Reihenfolge: das `/`-Menü zuerst.

## Was wir aus dem Vortrag **nicht** übernehmen

- „Stop Prompting“ als Gegensatz: Harness Engineering ist ein Teil von Kontext-Engineering, kein Ersatz. Der Text der Anleitungen bleibt wichtig.
- Die Formel als Rechnung: Sie ist eine Eselsbrücke, keine Messung.
- Das Abonnement des Anbieters als Weg: Pult arbeitet mit dem Zugang der Lehrkraft (Schlüssel, Flat-Tarife wie OpenCode Go).
