# Recherche: Animationen und Bewegtbild für Pult

Stand: 2026-10-08 · Verfasser: Recherche-Agent · Auslöser: Yannik will Animationen wie in den aktuellen Instagram-Reels ("Claude Motion Tips", @withian.t), und zwar **mit jedem zugelassenen Modell**.

Die Quelle der Reels ist ein Transkript aus zweiter Hand. Geprüft wurden nur die genannten Repositories und Pakete, nicht die Reels selbst. Sterne und Push-Daten stammen aus der eingebrachten Recherche (`docs/recherche/werkzeug-recherche.md` und der Auftragstext) und sind **nicht** von mir nachgeprüft.

## Kernaussage der Reels

Das Modell schreibt **Code, der ein Video ergibt**, keine Videodatei. Nur so bleiben Palette, Takt, Ausschnitt und Schrift einzeln steuerbar. Dazu: ein Projekt als Vorlage verlinken statt Adjektive schreiben, die Farben nennen, und das Modell sieht seine eigenen Bilder an und verbessert sie. Das passt zu Pult (feste Teile als Programm, das Modell liefert nur den Inhalt). Die Reels zeigen aber ein **sehr starkes Modell**, das frei Code schreibt und seine eigene Arbeit sieht. Das ist nicht mit jedem Modell gleich gut wiederholbar.

## Lizenzen (LICENSE-Datei oder npm-Eintrag, 2026-10-08)

| Baustein | Lizenz | Urteil für Pult |
|---|---|---|
| anime.js 4.5.0 (npm `animejs`) | MIT, 116 KB minimiert, kommt als eine Datei zum Einbetten | **Ja.** Zeitleiste mit `seek(t)` |
| Three.js 0.186 | MIT | möglich für 3D, nicht dringend |
| p5.brush 2.2.3 | MIT, aber Voraussetzung ist **p5.js 2.3.4 unter LGPL-2.1** | **Nein**, solange Code aus LGPL-Projekten ausgeschlossen ist (`ROADMAP.md`) |
| GSAP 3.15 | "Standard no charge license" (keine freie Lizenz, mit Wettbewerbsklausel) | **Nein**, solange die Lizenzfrage offen ist (steht in der Roadmap) |
| thinking-orbs 0.3.2 | MIT | nicht verwendet: gepunktete Kugeln sind das bekannteste "KI denkt"-Zeichen und widersprechen der Leitplanke "nicht nach Standard-KI". Die Fortschrittsanzeige ist ohnehin gebaut |
| awesome-opus5-5-videos | MIT (Sammlung) | **Nein** als Mitlieferung: Jeder Prompt stammt aus einem fremden Beitrag, die Lizenz der Sammlung gilt nicht für diese Texte. Als Ideenquelle lesbar |
| HyperFrames (`heygen-com/hyperframes`, npm `hyperframes` 0.8.140) | Apache-2.0 | siehe nächster Abschnitt |
| Lucide (`lucide-static`) | ISC | für Symbole möglich (Lizenzhinweis nötig) |
| Tabler Icons (`@tabler/icons`) | MIT | für Symbole möglich |
| Phosphor (`@phosphor-icons/core`) | MIT | für Symbole möglich |

## HyperFrames: "genau unsere Pipeline"? Nur im Aufbau

HTML rein, Video raus, für Agenten gebaut, Apache-2.0. Aber laut README: **Anforderungen Node.js 22+ und FFmpeg**, der Renderer nimmt jedes Bild **in Headless-Chrome** auf (Puppeteer) und kodiert mit FFmpeg. Beides müssten Kolleginnen und Kollegen installiert haben. Das verletzt "Alles in der App" (`docs/entscheidungen/002-alles-in-der-app.md`), solange Pult nicht beides mitliefert.

FFmpeg zum Mitliefern ist ein Lizenzproblem:

- `ffmpeg-static` 5.3.0: **GPL-3.0-or-later**, passt nicht zu Apache-2.0.
- `@ffmpeg-installer/ffmpeg` 1.1.0: Paket LGPL-2.1, **ob die enthaltenen Programme es auch sind, ist ungeprüft**.
- Alternative im Browser ohne FFmpeg: `mp4-muxer` 5.2.2 (MIT) oder `mediabunny` 1.61.3 (MPL-2.0), mit dem Kodierer des Browsers (WebCodecs). **Ungeprüft:** ob Electrons Chromium H.264 kodieren darf, auf Mac und Windows.

Die "bestehende Render-Pipeline" aus der Recherche gehört zu einem anderen Projekt von Yannik. In Pult gibt es keine.

## Naheliegende Lösung: eine einzelne HTML-Datei

Im Unterricht läuft ein Erklärstück meist am Beamer. Eine **HTML-Datei, die ohne Internet im Browser läuft**, leistet das ohne Encoder, ohne FFmpeg und ohne Lizenzfrage. MP4 braucht man nur, wenn jemand das Video irgendwohin hochladen will. Das ist als Entscheidungsfrage ins Issue gegangen.

## Probe: Wasserfarben-Look ohne Modell (2026-10-08)

Dateien: `bewegtbild/probe-wasserkreislauf.html` (Quelltext) und `bewegtbild/probe-wasserkreislauf.jpg` (sechs Momente).
Zum Ansehen: `anime.umd.min.js` aus `animejs@4.5.0/dist/bundles` und `assets/fonts/Fraunces_600SemiBold.ttf` neben die HTML-Datei legen und im Browser öffnen. Zum Bild für Bild Aufnehmen ruft ein Programm `window.seek(ms)` auf.

**Was belegt ist:**
- Wasserfarben-Look (wackelige Kante, dunklerer Rand, Pigmentflecken, Papierkorn) entsteht allein aus **SVG-Filtern** (`feTurbulence`, `feDisplacementMap`, `feMorphology`). Kein p5.js, kein Modell.
- Von Hand wirkende Pfeile zeichnen sich über `stroke-dashoffset`. Die Zeitleiste mit anime.js lässt sich mit `seek(t)` auf jeden Zeitpunkt setzen, jedes Bild ist reproduzierbar.
- Rechenzeit: rund **0,8 Sekunden je Bild** bei 1280×720 (gemessen mit sechs Bildern in Chromium auf diesem Rechner, einschließlich Anlauf). Ein Clip von 9 Sekunden bei 30 Bildern pro Sekunde wären etwa 3,5 Minuten. **Hochgerechnet, nicht gemessen.**

**Was die Probe nicht belegt:**
- Flüssiges Abspielen im Browser (die Filter sind teuer, wahrscheinlich müssen Ebenen vorab zu Bildern gerechnet werden).
- Aussehen in Safari, Firefox und Edge (nur Chromium geprüft).
- Qualität bei schwachen Modellen (kein Modell beteiligt, kein Schlüssel verfügbar).
- Feinschliff: Pigmentflecken zu grob, Sonne klumpig, Wolke zu blass, Titel überlappt die Hügel. Letzteres muss ein festes Layout-Programm verhindern, kein Modell.

## Zwei Stufen für "mit jedem Modell"

| Stufe | Wer | Wie | Zusage |
|---|---|---|---|
| 1. Szenenbeschreibung | jedes zugelassene Modell | Das Modell liefert Szenen, Texte, Elemente aus einem festen Katalog, Palette, Takt. Pult baut daraus die Animation (wie die Schaubilder im Arbeitsblatt, die mit DeepSeek V4.1 flash 94 % der Kriterien erreichten, `evals/BASELINE.md`) | **Boden:** sauber, im Pult-Stil |
| 2. Freier Code | starke Modelle | Eigener Code mit unseren Bausteinen und anime.js. Pult rendert einige Bilder, das Modell sieht sie (Bilder können alle zugelassenen Modelle) und verbessert höchstens zweimal | **Decke:** schöner, modellabhängig. Braucht einen Browser im Hintergrund, vor Phase 6 (Electron) nicht ohne Installation |

**Grenze bei "schönen Illustrationen":** Mit einem festen Katalog sind es Formen (Sonne, Wolke, Hügel, Wasser, Pfeile, Schaubilder, Symbole in Wasserfarben-Behandlung). Frei gezeichnete Szenen zu beliebigen Themen können nur starke Modelle in Stufe 2.

## Offen

1. **Messung "Stufe 1 mit mehreren Modellen"** (zehn Themen, drei Modelle). Macht die Recherche, sobald ein Schlüssel und der Szenen-Baustein da sind.
2. Rechenzeit live und im Browser-Vergleich.
3. H.264 in Electron (nur relevant, wenn MP4 entschieden wird).
4. Ob eine Sammlung wie "Beispiel-Prompts für Bewegung" als Referenzdatei taugt, ohne fremde Texte zu übernehmen. Eigene Beispiele schreiben ist der sichere Weg.
