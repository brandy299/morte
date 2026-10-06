# Erste Messung (2026-10-06)

Material: Claude Haiku 4.5, Prüfer: Claude Sonnet 4.5, beide über OpenRouter. Jeder Testsatz einmal gespielt, zusammen 14 Läufe. Kosten je Lauf etwa 0,75 US-$.

| Anleitung | Lauf 1 | Lauf 2 (nach den Änderungen unten) |
|---|---|---|
| Arbeitsblatt | 84 % | 86 % |
| Differenzieren | 87 % | 85 % |
| Klausur | 94 % | 89 % |
| Lernsituation | 88 % | 72 % |
| Stunde planen | 56 % | 89 % |
| Stunde vorbereiten | 95 % | 83 % |
| Verständnis-Check | 88 % | 88 % |

Anteil bestandener Kriterien. **Das ist eine Messung mit sehr wenigen Läufen.** Modelle antworten jedes Mal anders, Unterschiede von 10 Prozentpunkten sind Rauschen. Belastbar ist nur der Sprung bei „Stunde planen“, weil dort die Ursache gefunden und behoben wurde. Für Vergleiche `--wdh 3` benutzen.

## Was die Prüfung gefunden hat

1. **Zu viele und unnötige Rückfragen** (am häufigsten): Das Modell fragte bei vollständigen Anfragen nach Lernzielen, Ablauf oder Handlungsprodukt und bei knappen Anfragen mehr als zwei Dinge, ohne einen Entwurf anzubieten. Dadurch entstand oft gar kein Material. *Geändert:* Der Systemtext und die Anleitungen „Stunde planen“ und „Lernsituation“ sagen jetzt ausdrücklich, was die Lehrkraft nie gefragt werden soll. „Stunde planen“ stieg von 56 auf 89 %. Bei „Lernsituation“ blieb das Problem und ist die größte offene Schwäche.
2. **Behauptungen ohne Deckung:** Das Modell sagte „in der Stundentabelle eingetragen“, obwohl ein Blatt dort fehlte, oder „angelegt“, obwohl nichts angelegt war. *Geändert:* Der Systemtext verlangt ehrliche Berichte nach den Rückmeldungen der Werkzeuge.
3. **Klausur: Verteilung der Bereiche** wich von den Vorgaben der Lehrkraft ab (35/35/29 statt 30/50/20). *Geändert:* Das Werkzeug meldet jetzt Abweichungen über 10 Prozentpunkte und verlangt eine neue Fassung. In Lauf 2 lag die Abweichung bei höchstens 9 Punkten.
4. **Nicht vorhandenes Material in der Planung** (Handouts, Videos, Vorlagen), in beiden Läufen. *Geändert:* Material, das es noch nicht gibt, muss „(noch zu erstellen)“ heißen, und das Kriterium sagt das auch. Noch nicht neu gemessen.
5. **Platzhalter und unvollständige Aufgaben** (`[Name]`, Zuordnungen ohne die zuzuordnenden Begriffe, Lösungen, die abbrechen): Das ist ein Qualitätsproblem des kleinen Modells. Noch keine Gegenmaßnahme.
6. **Erfundene Wochentage** in der Vorbereitung („Montag, 14.10.“): trotz Verbot. Noch keine Gegenmaßnahme.
7. **Technik in den Antworten** („Skill“, „.pdf“) in einzelnen Läufen.

## Was die Prüfung nicht sagt

Ob die Aufgaben fachlich gut sind, entscheidet am Ende nur eine Lehrkraft. Die Kriterien sind von mir geschrieben und noch von keiner Lehrkraft gegengelesen. Mit einem stärkeren Modell für das Material (statt Haiku) dürften viele Fehler verschwinden. Auch das sollte gemessen werden.
