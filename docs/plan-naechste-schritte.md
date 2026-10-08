# Plan: die nächsten vier Wochen

Stand: 2026-10-08 · Besitzer: Recherche-Agent (Feature- und Planungsrolle) · Vorgaben von Yannik vom 2026-10-08

## Ausgangslage (Yanniks Antworten)

- **Erste Nutzer:** er selbst, danach zwei bis drei Kolleginnen und Kollegen. Kein Installer, keine Schul-Voreinstellung jetzt.
- **Kosten:** jede Lehrkraft mit eigenem Schlüssel. Pult muss also mit günstigen Modellen verlässlich sein.
- **Wichtigstes Ergebnis in vier Wochen:** Robustheit und Qualität.
- **Fächer:** Mathematik und Naturwissenschaften, Sprachen, Wirtschaft und Verwaltung, Gesellschaftswissenschaften. In vier Wochen nicht alle. Die Reihenfolge richtet sich nach den Fächern der Kolleginnen und Kollegen im Probelauf.
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

## Nicht jetzt

- Installer, Login, Schul-Voreinstellung (Issue #11 bleibt liegen).
- Python in der App über Pyodide (SymPy läuft dort, siehe `docs/recherche-werkzeuge-bewertung.md`). Erst, wenn eine Kollegin oder ein Kollege im Probelauf Mathematik oder Naturwissenschaften unterrichtet.
- Gepunktete Lade-Orbs, Audio-Takt, Sammlung fremder Prompts, Sitzplan, E-Mail und iServ.

## Offen (braucht eine Entscheidung von Yannik)

1. **Fächer und Betriebssysteme der Kolleginnen und Kollegen im Probelauf.** Ordnet Woche 3 und das Fach, in dem die Prüfläufe zuerst nachgeschärft werden.
2. **Wer liest die Prüfkriterien fachlich gegen?** Voraussichtlich Yannik. Mit festem Termin.
3. **Erklärstück:** zehn Themen aus seinem Unterricht für die Messung.
4. **Schlüssel für die Messung** (OpenRouter oder DeepSeek reichen) und Freigabe der Kostenschätzung vor jedem langen Prüflauf.
5. **Betriebssystem Windows:** bisher nur Linux getestet. Der Probelauf sollte es klären (steht in #18).

## Risiken

- **Die Einrichtung ist die größte Hürde im Probelauf:** Node.js installieren, Schlüssel besorgen. Das ist eine Ausnahme von "Alles in der App", nur für den Probelauf.
- **Eigene Schlüssel** heißen: viele wählen das günstigste Modell. Die Messung in #16 ist deshalb Voraussetzung für jede Empfehlung.
- **Animationen:** Flüssiges Abspielen, andere Browser und schwache Modelle sind ungeprüft (Details im Issue #14).
