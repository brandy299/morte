# 027: Schaubilder werden vor dem Zeichnen geprüft

Stand: 2026-11-09

## Anlass

Schaubilder auf Folien und Arbeitsblättern hatten Fehler, die sie unbrauchbar machten: Beschriftungen von Pfeilen lagen übereinander und über Kästchen, ein Pfeil lief quer durch den Text in der Mitte eines Kreislaufs, Wörter wurden in der Mitte getrennt („Sozialversic-herungen“) oder abgeschnitten.

## Ursachen

- Die Beschriftung eines Pfeils saß immer genau in der Mitte des Pfeils. Bei drei Pfeilen von einem Kästchen aus liegen diese Mitten dicht beieinander.
- Die Kästchen bekamen eine feste Breite aus der Bildbreite. Ein langes Wort passte nicht hinein und wurde zerschnitten.
- Der Text in der Mitte eines Kreislaufs stand immer in der Mitte, auch wenn dort ein Pfeil durchlief.
- Niemand prüfte das fertige Bild.

## Entscheidung

1. **Platz für Beschriftungen suchen.** `etikettSetzen` (`src/core/material/schaubild-lage.ts`) probiert Stellen entlang des Pfeils und Formulierungen in einer, zwei oder drei Zeilen und nimmt die ohne Überlappung. Reicht der Platz nicht, legt der Aufbau die Kästchen weiter auseinander und probiert noch einmal.
2. **Pfeile weichen aus.** Läuft ein Pfeil durch ein drittes Kästchen, bekommt er einen Knick drumherum (`umweg`).
3. **Text in der Mitte** bleibt in der Mitte, solange dort frei ist. Sonst sucht er den nächsten freien Fleck, sonst steht er als Überschrift über dem Bild.
4. **Wörter bleiben ganz.** Die Kästchen werden so breit wie das längste Wort. Ist das Bild dafür zu schmal, wird es breiter gelegt und kleiner gezeichnet (`Szene.k`, höchstens auf 70 Prozent). Ein Wort, das auch dann nicht passt, wird abgelehnt.
5. **Prüfung des fertigen Bildes.** `pruefeSzene` findet Überlappungen, Text, der nicht ins Kästchen passt, Teile außerhalb des Bildes und Pfeile durch Kästchen oder fremde Beschriftungen. `szeneVon` zeichnet kein Bild mit Fehlern. Schon beim Prüfen der Eingabe (`parseSchaubild`) wird einmal in der echten Breite gelegt, damit die KI die Meldung (in einfacher Sprache, mit dem Hinweis, was zu ändern ist) noch im selben Werkzeugaufruf bekommt. Auf Folien mit Text neben dem Bild ist das die schmale Breite.

## Folgen

- Sehr volle Schaubilder (zum Beispiel sieben Kästchen mit langen Texten und Beschriftung an jedem Pfeil) werden abgelehnt statt falsch gezeichnet. Die KI vereinfacht sie.
- Auf schmalen Folien kann die Schrift im Schaubild etwas kleiner werden, wenn ein langes Wort Platz braucht.
- Der Zeitstrahl nutzt nur noch 1,6 statt 1,9 Abstände Breite je Text, weil sich sonst äußere Texte überlappten (von der Prüfung gefunden).
- Die Säulendiagramm-Einheit bekommt etwas mehr Abstand zur obersten Achsenzahl (gleicher Fund).
