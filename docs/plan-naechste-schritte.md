# Plan: die nächsten vier Wochen

Stand: 2026-10-08 (aktualisiert nach Yanniks Antworten zu Fächern, Themen und Gegenlese) · Besitzer: Recherche-Agent (Feature- und Planungsrolle) · Vorgaben von Yannik vom 2026-10-08

## Ausgangslage (Yanniks Antworten)

- **Erste Nutzer:** er selbst, danach zwei bis drei Kolleginnen und Kollegen. Kein Installer, keine Schul-Voreinstellung jetzt.
- **Kosten:** jede Lehrkraft mit eigenem Schlüssel. Pult muss also mit günstigen Modellen verlässlich sein.
- **Wichtigstes Ergebnis in vier Wochen:** Robustheit und Qualität.
- **Fächer der Kolleginnen und Kollegen im Probelauf:** **Mathematik, Englisch und INWI** (Wirtschaft und Verwaltung) am **Berufskolleg**, dazu **Geschichte und Sozialwissenschaften an einem Gymnasium**. Bildungsgänge am Berufskolleg: Handelsschule I und II, Höhere Handelsschule, Berufsschule (zum Beispiel Büromanagement). Naturwissenschaften kommen später.
- **Betriebssysteme:** Mac **und** Windows. Beides ist bisher nicht getestet (nur Linux). Gehört in die Abnahme jedes neuen Bausteins und in den Probelauf (#18).
- **Beispielthemen für den Probelauf:** "Geschäftsbriefe in Word erstellen", "Business Letters auf Englisch verfassen", "Bewerbungstraining (Anschreiben und Lebenslauf erstellen)". Die zehn Themen für die Messung werden daraus abgeleitet.
- **Erste Themen (2026-10-08):** Mathe: Prozentrechnung und Dreisatz. Geschichte (Gymnasium): Deutsche Geschichte, Drittes Reich und Geschichte der BRD. Sie dienen als **Stichprobe für die Prüfläufe**, nicht als Grenze: Pult wird nicht auf Themen vorbereitet, sondern auf Arten von Material (Formeln, Quellenarbeit, Zeitleisten, Briefe, Schaubilder). Das Thema liefert das Modell.
- **Fachliche Gegenlese:** Yannik, vorerst allein ("erstmal"), **Termin: Samstag, 2026-10-10**. Für **Mathematik kann er nicht gegenlesen** (eigene Aussage). Dafür muss die Mathe-Lehrkraft aus dem Probelauf die Kriterien und die Beispielblätter prüfen. Ohne sie gibt es keine Aussage zur fachlichen Güte in Mathe.
- **Didaktischer Wizard:** Yannik bietet an, ihn zu scrapen oder als gesammelte Ressource zu geben. Ungeklärt: Besitzer, Nutzungsbedingungen, ob Personendaten enthalten sind. Vorgehen siehe "Offen".
- **Zusätzlich, parallel:** tolle Animationen (Motion Graphics) **mit jedem zugelassenen Modell**.

## Arbeitsteilung

| Schritt | Wer | Wo |
|---|---|---|
| Recherche | Recherche-Agent | `docs/recherche/`, `docs/recherche-*.md` |
| Vorgabe | Recherche-Agent | Issue mit **Abnahmekriterien** und **Nicht-Zielen** |
| Umsetzung | anderer Agent | Zweig und PR: Code, Tests, `ROADMAP.md` abhaken, Entscheidungsdatei mit der nächsten freien Nummer |
| Abnahme | Recherche-Agent | Kommentar am PR, geprüft gegen die Abnahmekriterien |

**Jede Datei hat einen Besitzer.** Recherche-Agent: `docs/recherche/`, `docs/recherche-*.md`, dieser Plan, Issues. Umsetzung: Code, Tests, `ROADMAP.md`, `docs/entscheidungen/`, `CLAUDE.md`. Braucht einer eine Änderung in der Datei des anderen, steht sie im Issue. Der Recherche-Agent schreibt keinen Code mehr. (Anlass: Name und Logo entstanden zweimal, das Zusammenführen hatte Konflikte in 13 Dateien, und es gab zwei Entscheidungsdateien zum selben Thema.)

**Zustand eines Issues** steht in der ersten Zeile des Textes: *Bereit zur Umsetzung*, *Entscheidung nötig* oder *Recherche*. Es gibt keine neuen Labels. Recherchedateien, die Yannik als Text schickt, liegen in `docs/recherche/`.

## Strang 1: Qualität und Robustheit (vier Wochen)

| Woche | Ziel | Issues | Ergebnis |
|---|---|---|---|
| 1. Messen | Prüfläufe mit allen empfohlenen Modellen und allen Anleitungen, mit Streuung | #16 | Tabelle "welches Modell schafft was". Danach entscheidet Yannik die empfohlenen Modelle und die Zielwerte |
| 2. Gedächtnis | Alte Anhänge und Bilder aus dem Gedächtnis nehmen. `Stand.md` mit echtem Modell erproben | #13 | Keine Abbrüche bei langen Gesprächen mit Dateien |
| 3. Probelauf vorbereiten | Eine Seite Anleitung, Rückmeldebogen, Schulkopf auf dem Material | #18, #17 | Alles, was die Kolleginnen und Kollegen brauchen |
| 4. Probelauf | Zwei bis drei Kolleginnen und Kollegen mit echtem Unterricht, Yannik sitzt die ersten Male dabei | (aus #18) | Auswertung und Plan für den Monat danach |

**Zielwerte** für die Prüfläufe werden erst nach der ersten Tabelle festgelegt. Eine Zahl vorher wäre geraten.

**Fachliche Güte** kann nur eine Lehrkraft beurteilen. Deshalb gibt es im Probelauf eine **feste Gegenlese-Runde**: Yannik liest die Prüfkriterien und ein, zwei fertige Materialien gegen, mit Fragen statt freiem Feedback ("Würdest du das so austeilen? Was streichst du?").

## Strang 2: Animationen (parallel)

Eigene Recherche: `docs/recherche/bewegtbild.md` (mit Probe `docs/recherche/bewegtbild/`).

| Schritt | Was | Issue |
|---|---|---|
| 1 | Entscheidung: HTML-Datei oder MP4 (Empfehlung: nur HTML, weil es am Beamer ohne Encoder läuft) | #15 |
| 2 | Szenenbeschreibung: Das Modell liefert den Inhalt, Pult baut die Animation mit festen Bausteinen im Wasserfarben-Look | #14 |
| 3 | **Messung** mit zehn Themen und drei Modellen, ausgewertet von der Recherche | kommt nach #14 |
| 4 | Stufe 2: Freier Code mit Selbstprüfung für starke Modelle | erst nach Schritt 3 und nach Phase 6 (Browser im Hintergrund) |

**Was "mit jedem Modell" bedeutet:** Stufe 1 liefert den **Boden** (immer sauber, im Pult-Stil, auch mit günstigen Modellen). Stufe 2 liefert die **Decke** (schöner, aber vom Modell abhängig). Frei gezeichnete Szenen zu beliebigen Themen kann nur Stufe 2. Mit dem Katalog sind es Formen, Schaubilder und Symbole in Wasserfarben-Behandlung.

**Lizenzen:** anime.js (MIT) ja. p5.js und damit p5.brush (LGPL-2.1) nein, GSAP (keine freie Lizenz) nein.

## Strang 3: Mathematik (neu, weil eine Kollegin oder ein Kollege Mathe unterrichtet)

Recherche: `docs/recherche/mathe-formeln.md`. Kernaussage: Pult setzt heute **keine Formeln**, LaTeX würde wörtlich im PDF stehen. Der Weg LaTeX → MathJax → SVG → PDF funktioniert ohne Browser (Probe: 7 Formeln in 98 ms, Apache-2.0), hat aber zwei bekannte Fehler (Überlauf am Rand, Umlaute in `\text{}`) und ist für Formeln im Fließtext und für Word ungeprüft.

| Schritt | Was | Issue |
|---|---|---|
| 1 | Formelsatz im PDF | #20 |
| 2 | Formeln in Word, als Bild (von der Recherche entschieden, umkehrbar) | #21, nach #20 |
| 3 | Mathe-Anleitung und Prüfläufe, Kriterien von der Mathe-Lehrkraft | Issue folgt, sobald die Lehrkraft Themen und Kriterien liefert |
| 4 | Rechenprüfung (Zahlen auswerten), erst nach Test mit echten Aufgaben | später |

**Mathe am Berufskolleg** heißt voraussichtlich Prozent-, Zins- und Dreisatzrechnung, Kalkulation, lineare und quadratische Funktionen. Das ist eine Annahme aus den Bildungsgängen, **nicht** vom Kollegen bestätigt. Sie macht Stochastik, Geometrie und Pyodide zunächst unwichtig.

**Geschichte (Gymnasium)** braucht Bilder aus Wikimedia Commons mit Lizenzangabe (#22; Recherche `docs/recherche/bilder-commons.md`). Entscheidung von Yannik: Symbole wie das Hakenkreuz dürfen im Unterrichtsmaterial vorkommen, Pult sperrt sie nicht, und es sind echte Quellen von Commons, nicht selbst gezeichnet. Offen: Zitate nur mit Quellenangabe (Regel für die Geschichts-Anleitung), kommt nach der Gegenlese am Samstag.

Englisch und INWI brauchen nach heutigem Stand keine neuen Bausteine, aber eigene Anleitungen und Prüfläufe: **Geschäftsbrief** (Form nach DIN 5008, Word-Ausgabe), **Business Letter** (englische Konventionen), **Bewerbung** (Anschreiben und Lebenslauf). Ob die mitgelieferten Anleitungen das schon abdecken, ist nicht geprüft und gehört in die Messung (#16).

## Nicht jetzt

- Installer, Login, Schul-Voreinstellung (Issue #11 bleibt liegen).
- Python in der App über Pyodide (SymPy läuft dort, siehe `docs/recherche-werkzeuge-bewertung.md`). Die Bedingung (eine Kollegin oder ein Kollege unterrichtet Mathematik) ist erfüllt, aber zuerst kommt das Setzen der Formeln. Ob die Rechenprüfung Pyodide wirklich braucht, ist offen (`docs/recherche/mathe-formeln.md`).
- Gepunktete Lade-Orbs, Audio-Takt, Sammlung fremder Prompts, Sitzplan, E-Mail und iServ.

## Offen (braucht eine Entscheidung von Yannik)

1. **Mathe-Lehrkraft nennen und fragen:** Welche Themen kommen in den ersten Wochen dran, was soll ein gutes Blatt können, welche Aufgaben sind typisch (zwei, drei echte, anonyme Beispielaufgaben)? Daraus entstehen Themen und Kriterien für Mathe.
2. **Gymnasium (Geschichte, Sozialwissenschaften):** ein anderer Rahmen als das Berufskolleg (Lehrplan, Bewertung, Quellenarbeit). Die Recherche prüft, welche Bausteine fehlen, sobald Themen genannt sind.
3. **Zehn Themen für die Messung**, aus den Beispielen oben abgeleitet. Yannik ergänzt Mathe-Themen (Schulform, Jahrgang).
3a. **Didaktischer Wizard:** Besitzer und Nutzungsbedingungen klären. Bevorzugt eine **schon exportierte Datei** statt Zugriff auf das laufende System, in `docs/recherche/`. Keine Zugangsdaten im Chat. Verwendet werden Aufbau und Ideen, kein Wortlaut, solange die Rechte nicht geklärt sind. Vorher prüfen, ob Namen von Schülern oder Lehrkräften enthalten sind.
4. **Schlüssel für die Messung** (OpenRouter oder DeepSeek reichen) und Freigabe der Kostenschätzung vor jedem langen Prüflauf.
5. **Betriebssystem Windows:** bisher nur Linux getestet. Der Probelauf sollte es klären (steht in #18).

## Risiken

- **Die Einrichtung ist die größte Hürde im Probelauf:** Node.js installieren, Schlüssel besorgen. Das ist eine Ausnahme von "Alles in der App", nur für den Probelauf.
- **Eigene Schlüssel** heißen: viele wählen das günstigste Modell. Die Messung in #16 ist deshalb Voraussetzung für jede Empfehlung.
- **Animationen:** Flüssiges Abspielen, andere Browser und schwache Modelle sind ungeprüft (Details im Issue #14).
