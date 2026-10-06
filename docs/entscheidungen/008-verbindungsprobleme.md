# 008: Wenn die Verbindung zum Modell Probleme macht

Stand: 2026-10-06

## Entscheidung

Fehler beim Anbieter werden nach ihrer Ursache sortiert (`src/core/agent/errors.ts`), jede Ursache bekommt einen eigenen Satz in einfacher Sprache und eine klare Antwort darauf, ob wiederholen sinnvoll ist.

| Ursache | Beispiel | Von allein wiederholen | Knopf "Nochmal versuchen" |
|---|---|---|---|
| Kein Zugang | falscher Schlüssel (401) | nein | nein, erst Einstellungen |
| Guthaben leer | 402, "insufficient credits" | nein | ja, nach dem Aufladen |
| Modell fehlt | 404 | nein | nein |
| Anbieter bremst | 429 | ja | ja |
| Anbieter überlastet | 5xx | ja | ja |
| Nicht erreichbar | "Connection error", kein Netz | ja | ja |
| Antwort abgebrochen | Leitung reißt mitten im Text | ja | ja |
| Antwortet nicht mehr | 120 Sekunden ohne Lebenszeichen | ja | ja |
| Sicherheitsstopp | "content_filter" | nein | ja |
| Netzsperre | Schulfilter liefert HTML mit 403 | nein | nein |
| Unbekannt | alles andere | nein | ja |

## Ablauf

- Kurze Störungen wiederholt morte bis zu dreimal selbst (nach etwa 2, 5 und 12 Sekunden, mit leichter Streuung; wünscht der Anbieter eine Wartezeit, gilt sie bis 30 Sekunden). Im Chat steht dann zum Beispiel "Der KI-Anbieter ist gerade überlastet. Neuer Versuch in 2 Sekunden (1 von 3) …".
- Der halbe Text des missglückten Versuchs wird zurückgenommen, auf dem Bildschirm und im Gespräch. Sonst stünde er nach einem neuen Versuch doppelt da. Schritte, die vorher schon liefen (zum Beispiel eine erstellte Datei), bleiben.
- Gemacht wird weiter ab dem letzten guten Stand (`agent.continue()`), die Frage wird nie ein zweites Mal gestellt. Das gilt auch für den Knopf "Nochmal versuchen".
- "Anhalten" durch die Lehrkraft löst nie einen neuen Versuch aus.
- Ein Wächter erkennt eine Verbindung, die stumm wird. Während ein Werkzeug arbeitet oder morte auf ein Ja der Lehrkraft wartet, zählt Stille nicht.
- Bricht die Verbindung zwischen Browser und morte ab, steht "Die Verbindung wurde unterbrochen" oder "Ich erreiche morte gerade nicht", mit dem Knopf. Ist der Computer offline, zeigt eine Leiste das an.
- Die Fehlertexte enthalten keine Fachbegriffe und keine Zahlen von Fehlercodes.

## Warum so

Bei einem Anbieter-Fehler gab es vorher nur "Das hat gerade nicht geklappt". Die Lehrkraft konnte nicht unterscheiden, ob sie warten, aufladen, das Netz wechseln oder einen anderen Anbieter nehmen soll. Zudem kostet jeder Abbruch Zeit und Nerven. Kurze Störungen sind bei Anbietern im Alltag häufig, sie sollen die Arbeit nicht unterbrechen. Probleme, die die Lehrkraft beheben muss (Schlüssel, Guthaben, Sperre), werden dagegen nicht blind wiederholt.

## Grenzen

- Die Erkennung beruht auf den Fehlertexten der Anbieter. Neue Formulierungen landen bei "Unbekannt", was harmlos ist (Knopf, kein Dauerfeuer). Die Texte wurden gegen einen absichtlich fehlerhaften Testserver geprüft (`src/core/agent/connection.test.ts`), nicht gegen jeden echten Anbieter.
- Ein Wechsel auf ein anderes Modell geschieht nie von allein, weil sich Kosten und Datenschutz damit ändern. Der Text verweist auf die Einstellungen.
- Wurde die KI in den Einstellungen neu eingerichtet, beginnt das Gespräch neu. Ein fehlgeschlagener Versuch lässt sich dann nicht mehr aufnehmen.
