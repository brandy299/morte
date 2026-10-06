# Skills und Skill-Builder

Skills sind das Herzstück von morte. Sie entscheiden, ob ein Arbeitsblatt oder eine Klausur wirklich gut wird, und zwar auch für Kolleginnen und Kollegen, die nie einen Prompt schreiben wollen.

## Was die Claude-App gut macht und wir übernehmen

1. **Gleiches Format:** Ein Skill ist ein Ordner mit `SKILL.md` (Name, Beschreibung, Anweisungen) und optional `references/`, `scripts/`, `assets/`. Das ist die offene Agent-Skills-Spezifikation (agentskills.io), die auch die Claude-App und Pi nutzen. Skills aus der Claude-App lassen sich also direkt übernehmen und umgekehrt.
2. **Stufenweises Laden:** Der Agent sieht anfangs nur Name und Beschreibung aller Skills. Die Anweisungen lädt er erst, wenn ein Skill passt, Referenzen und Vorlagen erst, wenn sie gebraucht werden. Das hält den Kontext klein und günstig, auch bei vielen Skills.
3. **Gute Beschreibungen:** Die Beschreibung entscheidet, wann ein Skill greift. Sie sagt, was der Skill tut und bei welchen Anfragen er gilt, mit den Wörtern, die Lehrkräfte wirklich benutzen ("Klassenarbeit", "Test", "EHZ").
4. **Feste Teile als Skript:** Was immer gleich aussehen muss (PDF-Layout, Graustufen, Kopfzeile, Bewertungstabelle), steckt in Vorlagen und Skripten, nicht in Prosa. So hängt die Optik nicht davon ab, wie gut das gewählte Modell gerade ist. Das ist wichtig, weil morte auch mit schwächeren Modellen funktionieren soll.

## Technische Umsetzung

- `pi-agent-core` bringt keine Skill-Verwaltung mit, die steckt in `pi-coding-agent`. morte bekommt einen eigenen kleinen Lader in `src/core/skills`: Ordner durchsuchen, Frontmatter lesen, Name und Beschreibung in den Systemprompt, ein Werkzeug `skill_laden` für die vollen Anweisungen.
- Skills können nur die festen morte-Werkzeuge nutzen (Material speichern, PDF erzeugen, Ordner lesen ...). Skripte in Skills laufen nur über ein dafür vorgesehenes Werkzeug, nie über eine freie Shell.
- In der Oberfläche heißt ein Skill "Vorlage" oder "Fähigkeit", nicht "Skill". Das genaue Wort wird beim UI-Text festgelegt.

## Drei Ebenen

| Ebene | Wer pflegt | Beispiel |
|---|---|---|
| Mitgeliefert | Yannik, per Update | Arbeitsblatt, Klausur mit EHZ, Lernsituation, Merkblatt |
| Schule (später, Phase 6) | Fachschaft oder Multiplikator | Notenschlüssel der Schule, Corporate Design |
| Persönlich | jede Lehrkraft | "Meine Vokabeltests für die 11a" |

Bei Namensgleichheit gewinnt die persönlichere Ebene. Mitgelieferte Skills sind schreibgeschützt. Wer einen anpassen will, bekommt eine persönliche Kopie.

## Arten von Skills

- **Material-Skills:** erzeugen etwas (Arbeitsblatt, Klausur mit Erwartungshorizont, Merkblatt, Lernsituation, Erklärvideo).
- **Wissens-Skills:** liefern Regeln (Bewertungsraster, Operatoren, Notenschlüssel, Anforderungen des Bildungsplans).
- **Ablauf-Skills:** führen durch einen Prozess (neue Klasse anlegen, Reihe planen, Stand nach der Stunde festhalten).

## Startsatz: neu schreiben, Vorbild ist Anthropic

Die mitgelieferten Skills werden neu geschrieben. Yanniks persönliche Skills aus der Claude-App sind zu sehr auf ihn zugeschnitten und werden **nicht** übernommen.

Vorbild ist `anthropics/k12-teacher-skills` (https://github.com/anthropics/k12-teacher-skills), die Skills aus "Claude for Teachers". Stand der Prüfung: 2026-10-05, Plugin-Version 0.9.0.

### Was dort drin ist

- Vier Skills: Unterrichtsplanung (`k12-lesson-plan-creation`), Differenzierung in drei Niveaus (`k12-lesson-differentiation`), Vorbereitung auf eine vorhandene Stunde (`k12-lesson-prep`), kurzer Verständnis-Check für Mathe (`k12-check-for-understanding`).
- Ein Bewertungsrahmen (`evals/`) mit 148 Prüfkriterien als CSV, gedacht für "LLM als Prüfer".
- Lizenz Apache-2.0 (wie morte). Übernehmen und Anpassen ist erlaubt, LICENSE und NOTICE müssen mitkommen und Änderungen gekennzeichnet werden. Die enthaltenen US-Standards (Common Core) stehen unter eigener Lizenz und werden nicht gebraucht.

### Warum der Inhalt nicht direkt passt

Die Skills sind für US-Schulen (Klasse K bis 12) gebaut: Common Core, NGSS, Klassenstufen-Bänder, und als Wissensquelle ein US-Konnektor (Learning Commons Knowledge Graph) mit den Standards aller 50 Bundesstaaten. Es gibt keinen Skill für Klausuren mit Erwartungshorizont, Lernfelder, Operatoren, Anforderungsbereiche oder handlungsorientierte Lernsituationen. Der Inhalt muss also für deutsche Schulen und Berufskollegs neu geschrieben werden.

### Was wir an Bauweise übernehmen

1. **Routing auf Referenzdateien:** Der Skill erkennt erst still das Fach und lädt dann verpflichtend die passende Referenzdatei (`references/math.md`, `ela.md` ...). Bei uns: Referenzen pro Fachgruppe und Schulform, zum Beispiel `references/fremdsprachen.md`, `references/wirtschaft.md`, `references/berufskolleg.md`.
2. **Höchstens zwei Rückfragen:** Fehlende Angaben werden mit sinnvollen Standards gefüllt, statt die Lehrkraft auszufragen. Rückfragen und das Angebot "Erst einen Entwurf?" gehen in einer Runde raus.
3. **Lehrersprache:** Niemals Werkzeugnamen, Dateinamen, "JSON" oder "Rendering" erwähnen, nur benennen, was die Lehrkraft bekommt.
4. **Fortschritt sichtbar:** In ein, zwei Sätzen sagen, was jetzt passiert, und die Schritte in der Aufgabenliste abhaken lassen.
5. **Eine Datenquelle, feste Skripte:** Das Modell erzeugt den Inhalt als strukturierte Datei (JSON), Skripte machen daraus Word, HTML oder PDF mit festem Theme. Genau unser Grundsatz "feste Teile als Skript".
6. **Erdung in Vorgaben:** Dort sind es US-Standards über den Konnektor. Bei uns ist es der hinterlegte Lehrplan (`Lehrpläne/…/Plan.md`: Bildungsplan am Berufskolleg, Kernlehrplan an Gymnasium und Gesamtschule). Fehlt er, kommt ein ehrlicher Hinweis ins Material ("Ohne hinterlegten Lehrplan erstellt") und es werden keine Fundstellen erfunden.
7. **Urheberrecht:** Immer eigene Inhalte schreiben, Vorlagen nur für Aufbau und Umfang nutzen, nie wörtlich übernehmen.
8. **Klare Abgrenzung in der Beschreibung:** Jede Beschreibung sagt auch, wofür der Skill *nicht* gedacht ist, damit nicht zwei Skills gleichzeitig greifen.

### Zielschulformen: NRW

Die mitgelieferten Skills gelten für drei Schulformen in NRW: **Berufskolleg**, **Gymnasium** und **Gesamtschule**. Andere Bundesländer und Schulformen sind vorerst kein Ziel, die Bauweise soll sie aber später zulassen.

Die Schulform steht in `Profil.md` und `Klasse.md`. Die Skills lesen sie dort und laden die passende Referenz, statt sie im Skill-Text fest zu verdrahten.

Geplante Referenzdateien pro Skill (alle Inhalte vor dem Schreiben gegen die Originalquellen prüfen, z. B. die Lehrplan- und Operatorenseiten des Landes NRW):

- `references/berufskolleg-nrw.md`: Bildungsgänge und Bildungspläne, Lernfelder und Lernsituationen, Handlungsorientierung, berufsbezogene Szenarien
- `references/gymnasium-nrw.md`: Kernlehrpläne Sek I und Sek II, Vorbereitung auf das Zentralabitur, Grund- und Leistungskurs
- `references/gesamtschule-nrw.md`: Kernlehrpläne Sek I, Fachleistungsdifferenzierung in Grund- und Erweiterungskurse, gemeinsame Oberstufe mit dem Gymnasium
- `references/operatoren-nrw.md`: Operatoren und Anforderungsbereiche I–III (schulformübergreifend, mit fachspezifischen Abweichungen)
- dazu fachbezogene Referenzen nach Fachgruppen (z. B. Fremdsprachen, Wirtschaft und Gesellschaft, MINT, Deutsch)

Was die Schulformen für die Skills verändert:

- **Berufskolleg:** Material hängt an einer beruflichen Handlungssituation und einem Lernfeld, nicht nur an einem Fachthema.
- **Gymnasium:** In der Oberstufe zählen Abiturnähe, Operatoren und Klausurformate des Zentralabiturs.
- **Gesamtschule:** Differenzierung ist der Normalfall. Material wird für Grund- und Erweiterungskurs angeboten, der Skill "Differenzieren" ist hier besonders wichtig.

### Geplanter Startsatz für morte

| Skill | Vorbild | Neu für Deutschland/Berufskolleg |
|---|---|---|
| Unterrichtsstunde planen | lesson-plan-creation | Verlaufsplan, Phasen, Handlungsorientierung, Bezug Lernfeld. Fertig (`stunde-planen`, eine Seite für die Lehrkraft) |
| Lernsituation / Reihe planen | (keins) | Handlungssituation, Lernfeldbezug, Stundentabelle in `Reihe.md`. Legt Reihe und alle Stunden mit einer Rückfrage an, Blatt mit Schülerseite und Planung. Fertig |
| Arbeitsblatt | Teile aus lesson-plan-creation | Graustufen, wenige Seiten, Operatoren |
| Klausur mit Erwartungshorizont | (keins) | Bereiche und Notenschlüssel stammen von der Lehrkraft (`Bewertung.md`, Entscheidung 003), Punkte und Grenzen rechnet das Programm. Fertig |
| Bewertungsregeln festhalten | (keins) | Ablauf-Skill: Bereiche und Notenschlüssel im Gespräch eintragen. Fertig |
| Differenzieren | lesson-differentiation | drei Niveaus, Sprachförderung (DaZ), gleicher Kerninhalt. Fertig (`differenzieren`, je Niveau ein Blatt mit Lösungsblatt) |
| Stunde vorbereiten | lesson-prep | kurze Vorbereitungsnotiz für die Lehrkraft. Fertig (`stunde-vorbereiten`, Notiz im Chat) |
| Verständnis-Check | check-for-understanding | auf alle Fächer erweitert, Distraktoren aus typischen Fehlern. Fertig (`verstaendnis-check`, Blatt plus Lösungsblatt mit Fehlvorstellungen) |

## Skill-Builder

Ziel: Eine Lehrkraft ohne Technikkenntnisse baut in zehn Minuten einen eigenen Skill, zum Beispiel "Klausuren wie bei mir in der Fachschaft".

### Zwei Wege hinein

1. **"Neue Vorlage anlegen"** über einen Button. Der Builder führt durch Fragen.
2. **"Daraus eine Vorlage machen"** nach einem gelungenen Ergebnis im Chat. Der Builder übernimmt, was im Gespräch festgelegt wurde (Aufbau, Regeln, Korrekturen), und fragt nur noch nach, was fehlt.

### Ablauf

1. **Was soll entstehen?** Materialart, Fach, Bildungsgang, Zielgruppe.
2. **Beispiel zeigen:** Eine alte Klausur oder ein Foto davon hochladen (Vision). Der Builder liest Aufbau, Aufgabentypen, Punkteverteilung und Layout heraus und fragt nach, was davon Regel ist und was Zufall. Vorher Hinweis: keine Schülernamen und keine korrigierten Arbeiten.
3. **Regeln abfragen:** Anforderungsbereiche, Operatoren, Punkte und Notenschlüssel (übernimmt `Bewertung.md` des Bildungsgangs, wenn vorhanden), Dauer, Hilfsmittel, Layout.
4. **Entwurf:** Der Builder schreibt `SKILL.md`, Vorlage und Beispiel. Die Lehrkraft sieht eine verständliche Zusammenfassung ("So wird deine Klausur aufgebaut ..."), nicht das Markdown. Das Markdown gibt es hinter "Details anzeigen".
5. **Probelauf:** Der Builder erzeugt sofort ein Testmaterial in der Vorschau.
6. **Nachschärfen:** Rückmeldungen wie "Aufgabe 3 immer mit Material" werden als Regel in den Skill geschrieben, danach neuer Probelauf.
7. **Speichern** als persönlicher Skill, mit klarer Beschreibung, damit er künftig von selbst greift.

### Qualität des Builders

- Der Builder ist selbst ein Skill (Ablauf-Skill) und folgt den Regeln oben: genaue Beschreibung, feste Teile als Vorlage, kurze Anweisungen.
- Er prüft jeden neuen Skill gegen eine Checkliste: Beschreibung nennt Zweck und Auslöser, keine Schülerdaten, keine widersprüchlichen Regeln, Layout über Vorlage statt Prosa.
- Später (optional): kleine Testfälle pro Skill, die bei Modellwechsel zeigen, ob der Skill noch gut funktioniert.

### Stand der Umsetzung

Der Skill-Builder steht: Skill `vorlage-bauen` führt durch die Fragen, `vorlage_speichern` prüft die Prüfliste (Beschreibung nennt Zweck und Abgrenzung, Anleitung hat Schritte, nennt nur vorhandene Werkzeuge, keine Namen von Lernenden) und legt die Vorlage unter `Skills/<name>/SKILL.md` im Datenordner ab. Der Probelauf lädt die neue Vorlage sofort. Nachschärfen geht über `vorlage_lesen` und erneutes Speichern. Eine neue Vorlage greift von selbst ab dem nächsten neuen Gespräch. Offen: Beispiel als PDF oder Word (bisher nur als Foto), Schul-Ebene, Teilen unter Kolleginnen und Kollegen.

## Qualitätsprüfung (nach Vorbild der k12-Evals)

Anthropic prüft die k12-Skills mit Kriterienlisten, die ein KI-Modell als Prüfer abarbeitet. Jedes Kriterium wird einzeln mit bestanden oder nicht bestanden bewertet. Das übernehmen wir:

- **Vier Gruppen wie dort:** P (Pädagogik), R (Anspruch und kognitive Tiefe), O (Form und Layout), M (Gesprächsführung, z. B. höchstens zwei Rückfragen).
- **Eigene Kriterien pro Skill** als CSV in `evals/<skill>/`, auf Deutsch und für deutsche Schulen formuliert (z. B. "Operatoren passen zum Anforderungsbereich", "Erwartungshorizont deckt jede Teilaufgabe ab", "druckbar in Graustufen").
- **Testsätze:** Pro Skill einige typische Anfragen, die bei jeder Skill-Änderung und jedem Modellwechsel neu durchlaufen. Ausgewertet wird die Bestehensquote pro Kriterium, nicht nur eine Gesamtnote.
- **Abgleich mit Lehrkräften:** Die Kriterien werden mit echten Kolleginnen und Kollegen nachgeschärft.
- Der Skill-Builder kann dieselben Kriterien nutzen, um selbst gebaute Skills zu prüfen.

## Offene Fragen

- Wort in der Oberfläche: vorerst "Vorlage" (Seite "Vorlagen", Skill `vorlage-bauen`). Mit Lehrkräften prüfen.
- Wie werden Skills geteilt (Datei exportieren, Schulordner, später ein Katalog)?
- Sollen persönliche Skills beim Update eines mitgelieferten Skills einen Hinweis bekommen?
