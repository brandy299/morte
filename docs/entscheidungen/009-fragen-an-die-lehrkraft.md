# 009: Fragen an die Lehrkraft

Stand: 2026-10-06

## Entscheidung

Fehlen dem Assistenten mehrere Angaben, stellt er sie nicht als Fließtext, sondern mit dem Werkzeug `fragen_stellen` (`src/core/agent/fragen.ts`). Die App zeigt die Fragen einzeln nacheinander ("Frage 2 von 3"), dann geht alles gebündelt zurück an das Modell.

## Regeln

- 1 bis 4 Fragen, je 2 bis 4 Antworten, zu jeder Antwort ein Satz, was sie bedeutet.
- **Jede Frage hat eine empfohlene Antwort und einen Grund dafür.** Das Werkzeug lehnt Fragen ohne Empfehlung oder ohne Grund ab, das Modell muss sie dann nachbessern. Die Empfehlung ist in der Oberfläche markiert, schon ausgewählt, und der Grund steht direkt darunter.
- Immer möglich: "Etwas anderes" mit eigenem Text, "Alle Empfehlungen übernehmen" und "Überspringen". Zurückgehen und ändern geht bis zum Senden.
- Die Antworten werden geprüft: Sie müssen zu den gestellten Fragen passen, eigene Antworten sind auf 600 Zeichen begrenzt.
- "Anhalten" beendet das Warten. Im Gespräch bleiben die Fragen und Antworten sichtbar (mit "empfohlen" am Rand), gespeichert wird ohne den Text der Begründung.
- Eine einzelne Ja/Nein-Rückfrage darf weiter im Text stehen. Fragen nach Dingen, die der Assistent selbst entscheiden soll (zum Beispiel "Soll ich einen Entwurf machen?"), sind verboten.
- Die Anleitungen (Skills) verweisen auf das Werkzeug. Im Prüflauf (`npm run eval`) gibt es keine Lehrkraft, dort werden die Empfehlungen übernommen.

## Gemessen

Mit DeepSeek V4.1 flash (über OpenRouter) und einer Klasse im Arbeitsordner: Bei "Plane mir eine Stunde zum Thema Bewerbung" stellte das Modell vier passende Fragen mit Empfehlungen und Gründen. Bei "Mach mir ein Arbeitsblatt" ohne jede Angabe und leerem Ordner fragte es offen nach Klasse und Thema im Text. Das ist in Ordnung, denn dafür gibt es keine sinnvollen Antwortvorschläge. Andere Modelle sind nicht gemessen.

## Grenzen

- Nur Einzelauswahl, keine Mehrfachauswahl.
- Beantwortet die Lehrkraft die Fragen nicht und lädt die Seite neu, sind die offenen Fragen weg. Das Gespräch geht mit einer neuen Nachricht weiter.
