# 028: Erklärstücke aus gestalteten Folien statt aus einem Raster

Stand: 2026-11-09

## Anlass

Die Erklärstücke sahen out of the box nicht gut genug aus: einzelne kleine Kästen, Texte und Formen auf einem Raster aus neun Plätzen, viel leere Fläche, wenig Gestaltung. Mehr Farbwelten (rund 40 Stile aus den Designsystemen von Open Design) haben das nicht geändert, denn das Problem war der Aufbau, nicht die Farbe.

## Entscheidung

1. **Die KI schreibt nur Inhalt und wählt pro Szene ein Layout.** Es gibt neun: `punkte` (Karten), `schritte` (nummerierte Karten), `ablauf` (Stationen mit Pfeilen), `kreislauf`, `zahl` (große Zahl), `vergleich` (zwei Seiten), `zeitstrahl`, `aussage` (Titel, Sätze, großes Symbol), `merksatz`. Größen, Abstände und Plätze legt Pult fest (`src/core/animation/html.ts`, `assets/animation/szenen.css`). Jedes Layout hat feste Grenzen für Zahl und Länge der Einträge (`src/core/animation/szene.ts`); was nicht passt, wird mit einer Meldung in einfacher Sprache abgelehnt.
2. **Das Aussehen kommt aus dem Baukasten „html-ppt“** aus Open Design (MIT, `assets/baukasten/`, Quelle und Stand in `NOTICE.md`): die Grundregeln (`base.css`) und 24 ausgesuchte Stile (`themes/`), unverändert übernommen. Die deutschen Namen und Beschreibungen stehen in `src/core/animation/stile.ts`.
3. **Echte Folien statt Zeichnung.** Eine Szene ist eine HTML-Folie auf einer festen Bühne von 1280 × 720, die auf das Fenster skaliert wird. Wenig Inhalt wird größer gezeigt, zu viel Inhalt als Ganzes verkleinert, damit nie etwas abgeschnitten ist.
4. **Lesbarkeit wird gerechnet.** Pfeile, Symbole und große Zahlen nehmen die Akzentfarbe nur, wenn ihr Kontrast zum Grund reicht, sonst die Textfarbe. Dasselbe gilt für die kleine Zeile über dem Titel und für Text auf der Akzentfarbe.
5. **Schriften bleiben in der Datei.** Source Sans 3 immer, Fraunces nur bei Stilen mit Serifen, Stile mit Schreibmaschinenschrift nehmen die des Computers. Die Web-Schriften des Baukastens werden nicht geladen (läuft ohne Internet, Entscheidung 002).

Die alten Stile (Wasserfarben, Kreide-Tafel, Fachbuch und der Katalog aus den Designsystemen), die gezeichneten Formen (Sonne, Wolke, Hügel, Wasser) und das Raster entfallen. Der Hintergrund mit Bewegung bleibt wählbar, ist aber nicht mehr Standard.

## Warum der Baukasten und nicht die Designsysteme

Die Designsysteme von Open Design beschreiben nur Farben, Schriften und Abstände. Der Baukasten bringt dazu fertige, aufeinander abgestimmte Regeln für Überschriften, Karten, Schatten und Kanten je Stil. Das ist der Teil, der vorher gefehlt hat.

## Folgen

- Eine Datei ist etwa 1,2 bis 1,5 MB groß (eingebettete Schriften). Kleiner ginge es, wenn nur die benutzten Zeichen eingebettet würden. Offen.
- Präsentationen (PowerPoint, PDF) nehmen vom gewählten Stil weiter nur Farben und Schrift. Der Umbau auf dieselben Layouts ist der nächste Schritt.
- Geprüft: Tests für jedes Layout und jede Grenze, ein Test im echten Browser, der für alle 24 Stile den längsten erlaubten Inhalt jedes Layouts legt und prüft, dass nichts über die Folie hinausragt. Zwei echte Läufe (Haiku 5.5, DeepSeek v4.1 flash) angesehen. Vortest mit Jev (4 Testsätze, Haiku 5.5): Erklärstück erstellt 2/2, Zahl der Szenen passt 2/2; die Zahlen sind ein grober Vortest. Nicht geprüft: Safari, Firefox, Edge und ein echter Beamer.
