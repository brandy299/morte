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

# Dritte Messung: empfohlene Modelle, nur ein Teil (2026-10-08)

**Das ist ein Teil der verlangten Tabelle, nicht die ganze.** Gemessen sind sieben empfohlene Modelle, aber nur die **zwei neuen Anleitungen** (`bewertung`, `vorlage-bauen`), weil das Geld nicht für mehr reichte. Die sieben älteren Anleitungen sind für diese Modelle **nicht gemessen**, ebenso nicht Claude Sonnet 5.5, GPT 5.4 und GPT 5.4 mini (alle drei kommen in der Empfehlungsliste nur über direkte Schlüssel von Claude und OpenAI vor, die es für die Messung nicht gab). Die volle Tabelle (alle Modelle × alle zehn Anleitungen × zwei Läufe) kostet mit diesem Prüfer geschätzt 30 bis 50 US-$.

- **Material:** sieben Modelle über OpenRouter: Claude Haiku 4.5, DeepSeek V4.1 flash, GLM 5.3 flash, Gemini 2.5 flash, Kimi K3, MiMo V2.6 flash, Qwen 3.8 flash.
- **Prüfer:** Claude Sonnet 4.5 über OpenRouter, wie in Messung 1 und 2. **Eine Änderung:** Der Prüfer bekommt seit dieser Messung zusätzlich den Abschnitt „GESPEICHERT“ (Bewertungsregeln und eigene Vorlagen am Ende des Laufs), sonst könnte er die zwei neuen Anleitungen nicht beurteilen. Das ändert die Eingabe für alle Anleitungen ein wenig. Werte aus Messung 1 und 2 sind deshalb nicht mehr streng vergleichbar.
- **Wiederholungen:** `--wdh 2`. `bewertung` hat drei Testsätze (6 Läufe), `vorlage-bauen` zwei (4 Läufe).
- **Befehl** (je Modell, der Schlüssel als Umgebungsvariable):
  ```
  PULT_EVAL_API_KEY=… npm run eval -- --modell openrouter/<modell> --pruefer openrouter/anthropic/claude-sonnet-4.5 --skill bewertung,vorlage-bauen --wdh 2 --limit 0.7
  ```
- **Kosten:** Die gültige Messung etwa 3,9 US-$ für sieben Modelle laut Zähler der Läufe je Modell 0,36 bis 0,77 US-$ mit Prüfer (Gemini am billigsten, Kimi K3 am teuersten; MiMo 0,34 bis zum Abbruch). Das Konto zeigt etwas mehr, weil abgebrochene und wiederholte Versuche dort mitzählen. Davor lief eine erste Messung für etwa 3,2 US-$, die ich **verworfen** habe (siehe unten).
- **Laufzeit:** Sieben Modelle gleichzeitig etwa 40 Minuten. Nacheinander wären es rund drei Stunden, `vorlage-bauen` braucht je Lauf mehrere Minuten (die Vorlage wird danach ausprobiert).

## Modell × Anleitung

Anteil bestandener Kriterien über alle Läufe, in Klammern der schlechteste und der beste einzelne Lauf.

| Modell | Bewertung festhalten | Eigene Vorlage bauen |
|---|---|---|
| Claude Haiku 4.5 | 94 % (92–100 %), 6 Läufe | 77 % (71–86 %), 4 Läufe |
| DeepSeek V4.1 flash | 94 % (77–100 %), 6 Läufe | 90 % (80–95 %), 4 Läufe |
| GLM 5.3 flash | 91 % (54–100 %), 6 Läufe | 91 % (67–100 %), 4 Läufe |
| Gemini 2.5 flash | 73 % (45–100 %), 6 Läufe | 66 % (57–73 %), 4 Läufe |
| Kimi K3 | 87 % (67–100 %), 6 Läufe | 88 % (73–100 %), 4 Läufe |
| MiMo V2.6 flash | 94 % (85–100 %), 6 Läufe | **keine auswertbaren Läufe** |
| Qwen 3.8 flash | 84 % (69–100 %), 6 Läufe | 89 % (82–93 %), 4 Läufe |

Bei sechs und vier Läufen sind Unterschiede unter etwa 10 Prozentpunkten Rauschen, wie schon in Messung 1 festgehalten. Die Spannweiten sind breit: Ein Modell kann denselben Testsatz einmal ganz und einmal halb bestehen.

**MiMo × Vorlage bauen:** Der Prüfer lieferte bei den langen Gesprächen wiederholt keine lesbare Antwort („kein JSON“), die Läufe liefen dann immer wieder neu und ich habe sie abgebrochen, um nicht das restliche Guthaben zu verbrennen. Die Gruppenwerte von MiMo unten beruhen deshalb nur auf `bewertung` und sind mit den anderen nicht vergleichbar.

## Modell × Gruppe

P Pädagogik, R Anspruch, O Form, M Gespräch. In Klammern die Zahl der gewerteten Kriterien.

| Modell | P | R | O | M |
|---|---|---|---|---|
| Claude Haiku 4.5 | 97 % (34) | 96 % (24) | 90 % (20) | 73 % (49) |
| DeepSeek V4.1 flash | 91 % (35) | 90 % (31) | 100 % (32) | 88 % (52) |
| GLM 5.3 flash | 97 % (34) | 90 % (29) | 93 % (29) | 87 % (52) |
| Gemini 2.5 flash | 83 % (35) | 73 % (22) | 65 % (20) | 61 % (49) |
| Kimi K3 | 91 % (33) | 87 % (30) | 86 % (29) | 87 % (52) |
| MiMo V2.6 flash (nur Bewertung) | 89 % (18) | 100 % (12) | 100 % (12) | 93 % (28) |
| Qwen 3.8 flash | 91 % (34) | 83 % (23) | 85 % (20) | 83 % (36) |

## Wurde wirklich gespeichert?

Ein Programmkriterium (`G-GESPEICHERT`) prüft nicht, was der Assistent sagt, sondern ob die gewünschten Regeln oder die Vorlage am Ende wirklich im Arbeitsordner stehen.

| Modell | Bewertungsregeln (4 Läufe) | Eigene Vorlage (4 Läufe) |
|---|---|---|
| Claude Haiku 4.5 | 4 von 4 | 4 von 4 |
| DeepSeek V4.1 flash | 4 von 4 | 4 von 4 |
| GLM 5.3 flash | 3 von 4 | 4 von 4 |
| Gemini 2.5 flash | **1 von 4** | 4 von 4 |
| Kimi K3 | **2 von 4** | 4 von 4 |
| MiMo V2.6 flash | 4 von 4 | – |
| Qwen 3.8 flash | 4 von 4 | 4 von 4 |

## Die drei schwächsten Paare

Maßstab: kleinster Gesamtanteil. Je zwei wörtliche Beispiele mit der Begründung des Prüfers.

**1. Gemini 2.5 flash × Eigene Vorlage bauen (66 %)**
- *vb-vollstaendig#1, V-O1 (Ausprobiert):* „Der Assistent hat die Vorlage nicht ausprobiert. In Runde 2 fragt er nur nach Informationen, erstellt aber kein Material mit der Vorlage, obwohl die Lehrkraft sagte 'mit dem Thema Bewerbung ausprobieren'.“
- *vb-vollstaendig#2, G-TECHNIK:* „In einer Antwort steht „skill_laden“.“ (Das Modell zeigt der Lehrkraft einen Werkzeugnamen.)

**2. Gemini 2.5 flash × Bewertung festhalten (73 %)**
- *be-vollstaendig#2, B-P1 (Nur festgehalten was gesagt wurde):* „Die gespeicherten Regeln weichen von den genannten ab: Bereich I sollte 25% sein, gespeichert sind 30%; Note 1 sollte ab 90% sein, gespeichert ist 92%; Note 3 sollte ab 65% sein, gespeichert ist 67%; Note 5 sollte ab 25% sein, gespeichert ist 30%.“ (Das sind die alten Zahlen: Die neuen Regeln wurden nicht gespeichert.)
- *be-vollstaendig#2, M1 (Rückfragen nur wenn nötig):* „Runde 1: Der Assistent fragt nach einem Namen für die Bewertungsregeln, obwohl die Lehrkraft bereits alle wesentlichen Angaben gemacht hat […]. Ein Name ist nicht wesentlich und könnte vom Assistenten selbst vergeben werden.“

**3. Claude Haiku 4.5 × Eigene Vorlage bauen (77 %)**
- *vb-vollstaendig#1, M1 (Rückfragen nur wenn nötig):* „Runde 2: Der Assistent fragt nach der Klasse, obwohl die Lehrkraft bereits sagte 'probier sie dann an einem Thema aus' und danach 'mit dem Thema Bewerbung ausprobieren'. Die Klasse steht in Klasse.md (11a), die er laut Vorlage lesen soll. Die Frage ist überflüssig.“
- *vb-vollstaendig#1, V-M1 (Wenige Fragen und Bestätigung):* „Runde 1: Der Assistent stellt drei Rückfragen ('englisch links und deutsch rechts oder wechseln', 'gleiche Schwierigkeit oder variabel', 'Vokabeln erfragen oder ableiten'), obwohl die Lehrkraft bereits sagte 'Mehr brauchst du nicht zu wissen, speichere sie gleich'. Es fehlt auch die Bestätigung in höchstens zehn Zeilen vor dem Speichern – er speichert in Runde 2 direkt ohne Zusammenfassung und Rückfrage.“

**Prüfer-Irrtum, stichprobenartig gegengelesen:** Zwei Urteile in den Beispielen oben und daneben sehen für mich zu streng aus und gehören nicht in die Zählung der Modellfehler: Bei Gemini × Vorlage bauen verlangt V-R1 „eine Zeile“ und der Prüfer wertet eine Beschreibung mit zwei Sätzen in einer Zeile als Fehler, V-M2 sieht in „ist gespeichert“ ein technisches Wort. Das zeigt, dass die **Kriterien nachgeschärft werden müssen**, bevor man einzelne Prozentwerte ernst nimmt. Das ist Sache der Gegenlese durch eine Lehrkraft (Nicht-Ziel in #16).

## Was die Messung gefunden hat

1. **Rückfragen nach Dingen, die nicht wesentlich sind** (Name der Regeln, Klasse trotz `Klasse.md`, Beispielblatt als Foto): bei Gemini und Haiku. Gleiche Schwäche wie bei Messung 1, jetzt auch bei den neuen Anleitungen.
2. **Behauptet statt gespeichert:** Gemini speichert Bewertungsregeln nur in einem von vier Läufen, Kimi K3 in zwei von vier, GLM in drei von vier. Sie sagen es oder fragen nur nach.
3. **Werkzeugname in der Antwort** (`skill_laden`): bei Gemini nach dem Speichern einer Vorlage. Die Antwort des Werkzeugs nennt den Namen, das Modell gibt ihn weiter.
4. **Vorlage nicht ausprobiert:** Das Modell kündigt das Ausprobieren an und fragt dann noch einmal nach (Gemini, Haiku).

Das sind Befunde, keine Änderungen. Anleitungen und Kriterien habe ich nicht angefasst (Nicht-Ziel in #16).

## Was die Messung nicht aussagt

- **Nichts über die fachliche Güte.** Ob eine gespeicherte Vorlage oder Regel pädagogisch taugt, entscheidet eine Lehrkraft.
- **Keine Zielwerte.** Welcher Wert „gut genug“ ist, legt Yannik nach der ersten vollständigen Tabelle fest.
- **Wenig Läufe, viel Rauschen.** Vier bis sechs Läufe je Zelle.
- **Der Prüfer gehört zur gleichen Firma wie Haiku.** Claude Sonnet 4.5 beurteilt Material von Claude Haiku 4.5. Ein Wohlwollen ist denkbar, aber nicht gemessen.
- **Nur über OpenRouter, nur Deutsch**, nur der erfundene Arbeitsordner der Prüfumgebung (Klasse 11a, Business English).

## Warum die erste Messung verworfen wurde

Die erste Messung (gleicher Befehl, etwa 3,2 US-$) hatte zwei Fehler **im Messaufbau**:
1. Die Anleitung verlangt, vor dem Speichern zu fragen „Soll ich das so speichern?“. Meine Testsätze hatten keine Antwort darauf, das Gespräch endete oft vor dem Speichern. Jetzt hat jeder Testsatz, der etwas speichern lässt, eine letzte Nachricht mit der Bestätigung.
2. Wurde nichts gespeichert, galten die Kriterien zur Vorlage als „trifft nicht zu“ und das Modell kam ohne Abzug davon. Jetzt gibt es `G-GESPEICHERT`, das genau das als Fehler zählt.

Zusätzlich wird der Prüfer bei einer unlesbaren Antwort bis zu dreimal einzeln gefragt, statt den ganzen Fall neu zu spielen.
