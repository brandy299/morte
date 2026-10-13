# 020: Rückkanal: „Passt“ und „Passt nicht“ am Material, nur auf diesem Computer

Stand: 2026-10-14 · Issue #55 · Grundlage: Blueprint zum Harness (Modul „Feedback-Loop“)

## Entscheidung

1. **Unter jedem fertigen Material stehen zwei Knöpfe:** „Passt“ und „Passt nicht“. „Passt nicht“ fragt nach einem Satz (höchstens 300 Zeichen) und weist darauf hin, keine Namen von Lernenden zu schreiben. Die Wertung lässt sich ändern. Bedienbar mit Tastatur, die Rückmeldung wird vorgelesen.
2. **Gespeichert wird beim Gespräch**, neben dem Ablaufprotokoll (`rueckmeldungen` in der Gesprächsdatei). Wir erfinden keine neue Ablage. Löscht die Lehrkraft das Gespräch, ist die Rückmeldung mit weg. Ein späteres Speichern des laufenden Gesprächs verliert sie nicht.
3. **Nichts wird gesendet.** Die Daten bleiben auf dem Computer. Weitergeben geht nur über eine Datei, die die Lehrkraft selbst speichert (Einstellungen, Datenschutz).
4. **Der Export enthält nur Zahlen und Arten:** Datum, Art des Materials (aus dem Dateinamen), Wertung, Modell, Namen der geladenen Anleitungen, Zahl der Werkzeugaufrufe und der abgelehnten. **Kein Gesprächstext, kein Materialinhalt, kein Titel, keine Klasse.** Der Satz der Lehrkraft ist nur dabei, wenn sie „Mit meinen Sätzen speichern“ wählt, und die Datei weist dann darauf hin, vor dem Weitergeben auf Namen zu prüfen.
5. **Geprüft wird am Server:** Nur Material, das zum Gespräch gehört, nur zwei Wertungen, der Satz als eine Zeile ohne Steuerzeichen, zu lange Sätze werden mit einer Meldung abgelehnt.

## Wofür es gedacht ist

Aus gesammelten „Passt nicht“-Fällen entstehen **von Hand** neue Testsätze für `evals/` und Verbesserungen an den Anleitungen. Es gibt keinen Automatismus und kein Hochladen. So schließt sich die Schleife (messen, ändern, wieder messen), die bisher nur beim Bauen lief.

## Nicht gebaut

- Sammeln über mehrere Lehrkräfte, Konten, Auswertung auf einem Server (Phase 6, nach Klärung des Datenschutzes mit Schulleitung und Datenschutzbeauftragten).
- Automatische Auswertung des Satzes durch ein Modell.
