# Ordnerstruktur

Die Ordnerstruktur ist die Architektur: Der Agent liest zur richtigen Zeit die richtigen Dateien (ICM-Ansatz). Die Oberfläche zeigt dieselben Daten ohne Dateipfade, zum Beispiel als "11a, Business English, Reihe Bewerbung".

## Entwurf

```
Lehrer-Harness/
├── Einstellungen/
│   ├── Profil.md                  (Name, Schule, Schulform, Fächer)
│   └── Provider.md                (welche KI genutzt wird; API-Keys NICHT hier, sondern im Schlüsselbund)
│
├── Lehrpläne/
│   ├── Höhere Handelsschule/       (Berufskolleg: ein Ordner pro Bildungsgang)
│   │   ├── Plan.md                (Bildungsplan, aus dem PDF per OCR umgewandelt)
│   │   ├── Bewertung.md           (Notenschlüssel, Gewichtung, Anzahl Klausuren)
│   │   └── Hinweise.md            (schulinterne Vorgaben, z. B. Fachkonferenz-Beschlüsse)
│   └── Englisch Sek I/            (Gymnasium/Gesamtschule: ein Ordner pro Fach und Stufe)
│       ├── Plan.md                (Kernlehrplan, plus schulinterner Lehrplan falls vorhanden)
│       ├── Bewertung.md
│       └── Hinweise.md
│
├── Klassen/
│   └── 11a/
│       ├── Klasse.md              (Schulform, Lehrplan-Ordner, Stufe, ggf. Kursniveau E/G oder GK/LK, Fächer, Besonderheiten)
│       └── Business English/
│           ├── Stand.md           (wo wir stehen, was als Nächstes dran ist)
│           └── 01 Bewerbung/
│               ├── Reihe.md       (Ziele, Kompetenzen, Planung, Stundentabelle)
│               └── Material/
│                   ├── 2026-10-12_Mo1_Arbeitsblatt-Lebenslauf.pdf
│                   └── 2026-10-14_Mi3_Rollenspiel-Interview.pdf
│
├── Stundenplan/
│   └── untis.ics                  (iCal-Synchronisierung)
│
├── Vorlagen/                      (Arbeitsblatt, Klausur, Merkblatt, Erklärvideo)
│   └── Designvorgaben.md
│
├── Skills/                        (die mitgelieferten Lehrer-Skills)
│
└── Exporte/                       (fertige PDFs und Videos zum Herunterladen)
```

## Warum so

- **Von oben nach unten lesen:** Klasse, Fach, dann `Stand.md`. Dort steht der aktuelle Stand, und der Agent weiß sofort, wo es weitergeht.
- **Lehrplan nur einmal:** Plan und Bewertung liegen an einer Stelle, jede Klasse verweist darauf. Am Berufskolleg ist das der Bildungsgang, an Gymnasium und Gesamtschule Fach und Stufe. Die Datei heißt überall `Plan.md`, damit Agent und Skills nicht nach Schulform unterscheiden müssen.
- **Wenige Ordner:** Eine Reihe ist ein Ordner mit `Reihe.md` und `Material/`. Die Stunden stehen als Tabelle in der `Reihe.md`.
- **Drag-and-Drop:** Wird Material auf eine Stunde im Stundenplan gezogen, legt der Harness die Datei in `Material/` ab und trägt sie in der Tabelle ein.
- **"Wo fehlt noch Material?":** Der Agent sucht Zeilen ohne Eintrag in der Spalte "Material".

## Vorlage: Stand.md

Pro Klasse und Fach, höchstens eine Bildschirmseite. Wird immer zuerst gelesen und nach jeder Sitzung kurz überschrieben.

```markdown
# Stand: 11a · Business English

Aktualisiert: 2026-10-05
Aktuelle Reihe: 01 Bewerbung (LF 3)
Zuletzt behandelt: Lebenslauf (12.10.), Schüler haben Entwurf begonnen
Nächste Stunde: Mi 14.10., 3. Stunde, Thema Interview
Offen / mitnehmen:
- Lebenslauf-Entwürfe fertig machen lassen
- Wortschatz "job interview" wiederholen
Besonderheiten: Klasse arbeitet gut in Partnerarbeit, Klausur am 04.11.
```

## Vorlage: Reihe.md

Pro Unterrichtsreihe. Wird nur bei Bedarf geöffnet.

```markdown
# Reihe: Bewerbung

Lernfeld: LF 3
Lehrplan: Höhere Handelsschule (siehe Lehrpläne/…)
Zeitraum: 12.10. – 04.11.
Kompetenzen / Ziele: (aus dem Bildungsplan übernommen)
Leistungsnachweis: Klausur 04.11. (siehe Bewertung.md)
Szenario: (zum Beispiel das Unternehmen, an dem die Reihe aufgehängt ist)

## Stunden
| Datum | Stunde | Thema | Material | Status |
|---|---|---|---|---|
| 12.10. | Mo 1 | Lebenslauf | Arbeitsblatt-Lebenslauf.pdf | gehalten |
| 14.10. | Mi 3 | Interview | | geplant |

## Notizen
(Was gut lief, was angepasst werden muss)
```

## Regeln für den Agenten

- **Lesereihenfolge:** `Klasse.md`, dann `Stand.md`, dann nur bei Bedarf die passende `Reihe.md`.
- **Aktualisieren:** Nach jeder Arbeitssitzung `Stand.md` kurz und überschreibend neu schreiben, Details in `Reihe.md`.
- **Status-Wörter fest:** `geplant`, `Material fertig`, `gehalten`. So lassen sich Abfragen zuverlässig beantworten.
- **Nichts erfinden:** Fehlt eine Angabe, bleibt das Feld leer, und der Agent fragt nach.
- **Datenschutz:** In `Stand.md` und `Reihe.md` stehen keine Schülernamen, nur Klassen- und Gruppenbeobachtungen.
