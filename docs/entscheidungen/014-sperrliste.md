# 014: Sperrliste für Modelle, die nicht verlässlich genug arbeiten

Stand: 2026-10-08 · Anlass: Yannik, 2026-10-08: "Die schlecht abschneidenden Modelle müssen ausgesperrt werden. Es MUSS funktionieren."

## Entscheidung

Pult bekommt eine **Sperrliste** (`BLOCKED` in `src/core/agent/models.ts`). Ein Modell auf der Liste wird nicht angezeigt, lässt sich nicht speichern und wird nicht benutzt. Bei jedem Versuch steht in einfacher Sprache, warum: "Dieses Modell ist für Pult gesperrt: <Grund>. Bitte wähle ein anderes."

- **Gleiche Stellen wie bei fehlenden Bildern.** Die Sperre gilt überall, wo schon geprüft wird, ob ein Modell geeignet ist: Auswahl in der Einrichtung (`listProviders`), Verbindungstest und Speichern (`/api/setup/test`, `/api/setup/save`, auch bei direktem Aufruf der Schnittstelle, vor jeder Anfrage an das Modell), Start mit einem früher gespeicherten Modell (die Einrichtung öffnet sich mit der Erklärung) und das Anlegen einer Sitzung (`createChatSession`).
- **Die Prüfläufe dürfen gesperrte Modelle benutzen** (`measuring: true`), sonst ließe sich ein Modell, das einmal gesperrt ist, nie wieder messen.
- **Schlüssel der Liste:** `anbieter/modell` wie im Katalog, zum Beispiel `openrouter/z-ai/glm-5.3-flash`. Eigene Server (Anbieter "custom") sind nicht betroffen, weil dort kein Katalog sagt, welches Modell dahinter läuft.
- **Der Grund** steht in der Liste, ohne Punkt am Ende, in Worten, die eine Lehrkraft versteht (nicht "Kriterium B-P1").

## Wann ein Modell auf die Liste kommt

**Die Liste ist zur Zeit leer.** Ein Modell kommt erst darauf, wenn
1. **alle zehn Anleitungen** für dieses Modell gemessen sind (Issue #16, `evals/BASELINE.md`), nicht nur zwei, und
2. Yannik eine **Schwelle** festgelegt hat (Zielwerte legt der Plan nach der ersten vollständigen Tabelle fest).

Die Teilmessung vom 2026-10-08 (zwei Anleitungen, vier bis sechs Läufe je Zelle) reicht dafür nicht: Unterschiede unter etwa 10 Prozentpunkten sind Rauschen, MiMo ist bei einer Anleitung gar nicht ausgewertet, und der Prüfer irrt sich teilweise. Yannik hat entschieden: erst nach der vollen Tabelle (Antwort vom 2026-10-08).

## Was die Sperrliste nicht leistet

"Es muss funktionieren" lässt sich mit einer Sperrliste allein nicht erreichen. Sie hält nur Modelle fern, die gemessen schlechter sind. Auch die besten gemessenen Modelle bestanden nicht alles (siehe `evals/BASELINE.md`). Was darüber hinaus hilft, sind Änderungen am Programm und an den Anleitungen, die jeweils eigene Aufgaben sind:
- **Das Programm prüft selbst, statt dem Modell zu glauben.** Die Messung zeigt Modelle, die "gespeichert" sagen, ohne zu speichern (`G-GESPEICHERT`). Das Werkzeug meldet nur Erfolg, wenn es wirklich gespeichert hat, aber das Modell kann die Meldung auslassen oder falsch wiedergeben.
- **Die Anleitungen so schreiben, dass auch schwache Modelle sie schaffen** (zum Beispiel einen Namen selbst vergeben, statt nachzufragen).
- **Einrichtungstest mit festen Aufgaben**, der ein unbekanntes Modell vor dem Speichern prüft. Das ist nicht gebaut (Yannik hat sich bewusst für die Sperrliste entschieden, nicht für diese Variante).
