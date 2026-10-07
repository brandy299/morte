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

# Zweite Messung: DeepSeek v4.1 flash (2026-10-06)

Material: `deepseek/deepseek-v4.1-flash` über OpenRouter (0,30 und 1,20 US-$ je Million Tokens), Prüfer wieder Claude Sonnet 4.5. Jeder Testsatz zweimal gespielt, also 4 Läufe je Anleitung, zusammen etwa 2,30 US-$.

| Anleitung | Haiku 4.5 (Lauf 2) | DeepSeek flash |
|---|---|---|
| Arbeitsblatt | 86 % | 85 % vorher, **93 %** mit den neuen Aufgabenarten |
| Differenzieren | 85 % | 94 % |
| Klausur | 89 % | 96 % |
| Lernsituation | 72 % | 97 % |
| Stunde planen | 89 % | 96 % |
| Stunde vorbereiten | 83 % | 89 % |
| Verständnis-Check | 88 % | 89 % |

Das Modell, das ein Zehntel von Haiku kostet, schneidet gleich gut oder besser ab. Es fragt weniger unnötig nach und legt nach dem „Ja“ zuverlässiger an.

## Was die Messung noch zeigte

- **Aufgabenarten:** Beim Arbeitsblatt fehlten in beiden Modellen oft die Teile von Zuordnungen und Lückentexten. Seit es Zuordnung, Lückentext, Auswahl und Tabelle als eigene Felder gibt und das Programm die Lösung schreibt, ist dieser Fehler nicht mehr aufgetreten.
- **Verwechslung der Anleitungen:** „Mach mir einen kurzen Test zum Lebenslauf“ führte einmal zur Klausur statt zum Verständnis-Check. Beide Beschreibungen grenzen sich jetzt ausdrücklich ab.
- **Messfehler im Prüfer:** Er kannte `Klasse.md` und `Stand.md` nicht und hielt echte Angaben („zwei Lernende sprechen zu Hause kein Deutsch“) für erfunden. Jetzt sieht er den Arbeitsordner.
- **Seitenlimit:** Es gilt für die Blätter der Lernenden, nicht für das Lösungsblatt der Lehrkraft.
- **Offen:** Die Blätter der Verständnis-Checks laufen manchmal auf zwei Seiten, und Wochentage werden gelegentlich noch erfunden. Der Rest der Fehler sind einzelne Aussetzer. Vier Läufe je Anleitung zeigen Richtungen, keine genauen Zahlen.
- **Laufzeit:** Ein Prüflauf braucht etwa 30 Minuten. Er läuft nur, solange die Sitzung aktiv ist. Zwischen meinen Antworten wird die Umgebung angehalten, deshalb sah es so aus, als dauere es ewig.
