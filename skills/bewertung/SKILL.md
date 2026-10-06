---
name: bewertung
title: Bewertungsregeln festhalten
description: Hält die eigenen Bewertungsregeln einer Lehrkraft fest, nämlich Anforderungsbereiche (so wie die Schule sie nennt) und Notenschlüssel, damit sie bei jeder Klausur automatisch genutzt werden. Nutze es bei Wünschen wie "Notenschlüssel eintragen", "Bewertungsraster festlegen", "Anforderungsbereiche hinterlegen", "so bewerten wir bei uns", "Punkte in Noten umrechnen". Nicht für das Erstellen einer Klausur selbst (dafür Klausur) und nicht für das Bewerten einzelner Arbeiten.
---

# Bewertungsregeln festhalten

Schulen und Fächer unterscheiden sich. Hier legt die Lehrkraft fest, was für ihre Klassen gilt. Du schreibst nur auf, was sie dir sagt, und ergänzt nichts aus eigener Vermutung. Zahlen, die sie nicht genannt hat, bleiben leer, und du fragst nach.

## Ablauf

1. **Vorhandenes ansehen.** Nennt die Lehrkraft eine Klasse, rufe `bewertung_lesen` auf. Gibt es schon Regeln, zeig sie kurz und frag, was geändert werden soll.
2. **Alles in einer Runde erfragen** (nicht Stück für Stück):
   - Für welche Klassen oder Kurse gilt das, und wie soll das Ganze heißen (zum Beispiel der Bildungsgang oder "Englisch Sek I")?
   - Anforderungsbereiche: Wie heißen sie bei euch (Kurzbezeichnung und Name), und gibt es Wunschanteile in Prozent? Es dürfen null, zwei, drei oder mehr sein.
   - Notenschlüssel: Welche Noten oder Punktstufen gibt es, und ab wie viel Prozent der Punkte gilt jede? Eine Tabelle oder ein Foto davon (ohne Namen) reicht, du liest sie dann aus.
   - Besonderes: zum Beispiel wie Klausuren gewichtet werden. Das ist freiwillig.
3. **Zurücklesen.** Zeig die Regeln in einer kleinen Übersicht und frag: "Stimmt das so?" Prüfe, dass die Prozentgrenzen von der besten zur schlechtesten Note kleiner werden. Weist ein Wert darauf hin, dass du etwas falsch gelesen hast, frag nach.
4. **Speichern.** Rufe `bewertung_speichern` auf. Das Werkzeug fragt die Lehrkraft vorher selbst.
5. **Antworten.** Sag in ein, zwei Sätzen, dass die Regeln gespeichert sind und bei jeder neuen Klausur für diese Klassen automatisch gelten. Nenne nie Dateinamen oder Werkzeugnamen.
