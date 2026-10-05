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

## Startsatz

Als Ausgangspunkt dienen die Skills, die Yannik schon in der Claude-App nutzt, zum Beispiel Klausur mit EHZ, Lernsituation, HTML-Lernpfade, Workshop-Folien, SOL und Miro-Boards. Sie sind auf Business English an der HBBK zugeschnitten und müssen für morte verallgemeinert werden: Fach, Bildungsgang und Schule kommen aus der Ordnerstruktur (`Bildungsgänge/…`, `Klasse.md`), nicht aus dem Skill-Text. Jeder Skill wird vor der Übernahme gelesen und einzeln geprüft.

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

## Offene Fragen

- Welches Wort sehen Lehrkräfte in der Oberfläche: "Vorlage", "Fähigkeit" oder "Skill"?
- Wie werden Skills geteilt (Datei exportieren, Schulordner, später ein Katalog)?
- Sollen persönliche Skills beim Update eines mitgelieferten Skills einen Hinweis bekommen?
