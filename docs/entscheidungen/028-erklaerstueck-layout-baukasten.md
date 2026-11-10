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
- Präsentationen: siehe unten.
- Geprüft: Tests für jedes Layout und jede Grenze, ein Test im echten Browser, der für alle 24 Stile den längsten erlaubten Inhalt jedes Layouts legt und prüft, dass nichts über die Folie hinausragt. Zwei echte Läufe (Haiku 5.5, DeepSeek v4.1 flash) angesehen. Vortest mit Jev (4 Testsätze, Haiku 5.5): Erklärstück erstellt 2/2, Zahl der Szenen passt 2/2; die Zahlen sind ein grober Vortest. Nicht geprüft: Safari, Firefox, Edge und ein echter Beamer.

## Präsentationen (PowerPoint und PDF)

Präsentationen bekommen dieselben neun Layouts (`layout` und `karten` an einer Folie; dieselbe Prüfung wie beim Erklärstück, `parseSzene`). Sie werden aber nicht als HTML gebaut, sondern wie bisher einmal geplant (`src/core/material/praesentation.ts`) und zweimal gezeichnet: als echte, bearbeitbare PowerPoint-Objekte (Karten, Kreise, Pfeile, Textfelder, Symbole als Bilder) und als PDF für die Vorschau. Farben, Kartenfläche, Rand und Rundung kommen aus dem gewählten Stil (`stilInfo`); den harten Schatten, Verläufe und Glaseffekte einzelner Stile kann PowerPoint so nicht, dort ist die Folie schlichter als das Erklärstück.

- Die Schrift im PowerPoint ist Georgia (Serifen) oder Calibri, die Vorschau nimmt Pults eigene Schriften. Serifentext bekommt etwas mehr Platz, weil Georgia breiter ist.
- Kein Wort wird mitten im Wort getrennt, solange es eine kleinere Schrift gibt, in der es passt. Hilft das nicht, wird ein sehr langes Wort getrennt, statt die Folie abzulehnen.
- Passt der Inhalt nicht, wird erst der Titel kleiner gesetzt, dann die Schrift der Karten. Danach lehnt Pult die Folie ab und nennt ein sehr langes Wort, falls es die Ursache ist.
- Die Stil-Auswahl zeigt für Präsentationen dasselbe Beispielbild wie für Erklärstücke.
- Geprüft: Test, dass der längste erlaubte Inhalt jedes Layouts in allen 24 Stilen und im klassischen Look auf der Folie bleibt; die .pptx mit LibreOffice geöffnet und angesehen; zwei echte Läufe (Haiku 5.5, DeepSeek v4.1 flash). Nicht geprüft: in echtem PowerPoint und Keynote.
