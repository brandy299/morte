# Welchen Schlüssel soll ich nehmen?

Stand: 2026-10-14. Gilt für den Probelauf (`docs/probelauf.md`). Die Empfehlung beruht auf den Messungen in `evals/BASELINE.md`.

## Kurz

**OpenRouter mit dem Modell „deepseek/deepseek-v4.1-flash“.** Das ist in Pult schon vorausgewählt, wenn du OpenRouter wählst.

Warum:
- **Gemessen:** Bei den Prüfläufen schnitt dieses Modell je nach Anleitung bei 89 bis 97 % ab, gleich gut oder besser als Claude Haiku 4.5, bei einem Zehntel des Preises.
- **Billig:** Der Preis liegt bei 0,30 und 1,20 US-$ je Million Tokens (Stand der Messung am 2026-10-06). Ein Prüflauf mit mehreren Gesprächen kostete etwa 0,3 bis 0,6 US-$ inklusive Prüfer. Wie viel du im Alltag verbrauchst, wissen wir noch nicht. Der Verbrauchsring in Pult zeigt es dir.
- **Ein Zugang für alles:** Mit einem OpenRouter-Schlüssel kannst du später andere Modelle ausprobieren, ohne ein neues Konto zu eröffnen.
- **Ausgabengrenze:** Bei OpenRouter kannst du für den Schlüssel eine Grenze setzen. Dann kann nie mehr abgebucht werden, als du erlaubst.

## So gehst du vor

1. Auf openrouter.ai ein Konto anlegen.
2. Unter „Credits“ zehn Euro aufladen.
3. Unter „Keys“ einen Schlüssel erstellen und eine **Ausgabengrenze** von zum Beispiel 10 Dollar setzen. Schlüssel gleich kopieren.
4. In Pult bei der Einrichtung „OpenRouter“ wählen, Schlüssel einfügen, „Verbindung testen“.

## Andere Wege

| Weg | Wann sinnvoll | Stand |
|---|---|---|
| **OpenCode Go** (Abo) | Du willst einen festen Monatspreis statt Guthaben. | Unterstützt, dieselben Modelle. Preis und Bedingungen prüfst du selbst auf der Seite des Anbieters. Ich nenne hier keine Zahl, weil ich sie nicht geprüft habe. |
| **Claude (Anthropic)** oder **OpenAI** mit eigenem Schlüssel | Du hast schon ein Konto bei der Firma. | Funktioniert, ist aber **nicht gemessen** und teurer. |
| **DeepSeek direkt** | Nur wenn dein Schulnetz es zulässt. | In manchen Schulnetzen gesperrt. Dann OpenRouter. |

## Wichtig: Abo und Schlüssel sind zwei Dinge

Ein **Claude-Abo** (Pro oder Max) oder ein **ChatGPT-Abo** ist **kein** Schlüssel und lässt sich in Pult **nicht** eintragen. Die Bedingungen von Anthropic erlauben es nicht, ein Abo in fremden Programmen zu benutzen (`docs/entscheidungen/023-abos-und-kosten.md`). Gebraucht wird ein Schlüssel (API-Schlüssel), der getrennt abgerechnet wird.

## Was die Messungen nicht sagen

- Die Prüfer sind Sprachmodelle, keine Lehrkräfte. Ob ein Arbeitsblatt fachlich gut ist, siehst nur du.
- Wenige Läufe je Modell, Unterschiede unter etwa 10 Prozentpunkten sind Rauschen.
- Nicht gemessen: Claude Sonnet 5.5, GPT 5.4 und die neuen Bausteine Erklärstück und Übung mit mehreren Modellen.
- Preise ändern sich. Schau vor dem Aufladen auf die Seite des Anbieters.
