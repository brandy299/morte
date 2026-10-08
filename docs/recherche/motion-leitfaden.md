# Leitfaden "Motion Graphics aus Code" (von Yannik eingebracht) und Einschätzung für Pult

Stand: 2026-10-08 · Einschätzung: Recherche-Agent · Quelle des Leitfadens: Yanniks eigener Schulclip (`~/Projekte/Motion-Demo/schulclip/`) und das Karussell von `@claudetipsandtricks` vom 2026-10-08 (`ANALYSE-KARUSSELL-OPUS55.md`). Weder Schulclip noch Karussell liegen mir vor, geprüft habe ich nur den Text unten. Die Zahlen darin (zum Beispiel 2,8 min, 2,5 gegenüber 7,5 Bilder je Sekunde auf einem M4) sind **Yanniks Messungen** und nicht von mir nachgemessen.

## Einschätzung

**Der Kern stimmt und deckt sich mit unserer Probe.** "Eine Szene ist eine Funktion der Zeit, `render(t)` zeichnet genau ein Bild" ist dasselbe, was `docs/recherche/bewegtbild/probe-wasserkreislauf.html` mit `window.seek(ms)` macht. Daraus folgen Wiederholbarkeit, Einstieg an jeder Stelle und Fehlersuche an einem einzigen Bild. Das gehört in #14 als Grundregel.

**Die Werkzeugkette passt nicht zu Pult.** Der Leitfaden ist ein Verfahren für Yanniks eigenen Rechner, nicht für Kolleginnen und Kollegen:

| Baustein im Leitfaden | Problem für Pult |
|---|---|
| GSAP | keine freie Lizenz (siehe `bewegtbild.md`). Ersatz: anime.js 4.5.0 (MIT), `seek(t)` ist in der Probe belegt |
| Playwright und Chromium | brauchen einen Browser im Hintergrund. Das verletzt "Alles in der App" bis zur Electron-Phase 6 |
| ffmpeg | nicht mitlieferbar (`ffmpeg-static` ist GPL-3.0-or-later). Und für den Unterricht reicht meist eine HTML-Datei (#15) |
| `~/Projekte/...` | liegt auf Yanniks Rechner |

Der Leitfaden beschreibt damit **Stufe 2** unseres Plans (freier Code mit Selbstprüfung durch gerenderte Bilder), nicht den Boden "mit jedem Modell". Stufe 1 (Szenenbeschreibung, #14) bleibt der Weg, der mit jedem Modell läuft.

## Was wir übernehmen

| Aus dem Leitfaden | Wohin | Nutzen |
|---|---|---|
| Szene als Funktion der Zeit, nie `requestAnimationFrame` | #14, Grundregel | Wiederholbarkeit |
| **Probe-Modus: acht Bilder, über den Film verteilt, nicht die ersten acht** | Abnahme von #14, später Selbstprüfung in Stufe 2 | früh sehen, was kaputt ist |
| Alle Ausgangszustände ausdrücklich setzen (`seek()` springt über `fromTo`) | Abnahmetest in #14: Bild bei `t` zweimal und in anderer Reihenfolge rechnen, Prüfsummen gleich | fängt die häufigste Fehlerquelle |
| Prüfsummen der Bilder vergleichen: **gleiche Nachbarbilder heißen, es bewegt sich nichts** | Test in #14 | automatisch prüfbar, braucht kein Modell |
| Schriften als Datei einbinden, `document.fonts.ready` abwarten | #14 | gleiches Bild ohne Netz |
| Muster 2 (Titel Wort für Wort, Staffelung 4 bis 6 Bilder bei 30 fps, Maske höher als die Zeile, sonst fehlen Unterlängen) | Baustein im Katalog von #14 | feste Zahlen statt Adjektive |
| Muster 4 (**erst Szenenplan, dann Bau**) | passt zu #14: Das Modell liefert zuerst die Szenenliste | verhindert sechs Fassungen derselben Szene |
| Muster 6 (**Daten animieren**: Balken wachsen, Zahl zählt aus demselben Wert `p`; Werte aus der Tabelle, nicht aus dem Code) | Baustein "Balkendiagramm aus Tabelle" im Katalog. Passt zu Mathe und Wirtschaft (Prozente, Zinsen, Umsätze) | "nächste Woche neue Zahlen, gleicher Aufbau" |
| Kosten: vollflächiges Korn mit `mix-blend-mode` und große Verläufe sind der Bremsklotz | `bewegtbild.md`, Abschnitt Probe: Rechenzeit (meine Messung 0,8 s je Bild passt zur Größenordnung) | Wasserfarben-Look kostet Rechenzeit |

## Was wir nicht übernehmen

- **GSAP, Playwright, ffmpeg** als Pult-Bausteine (siehe oben).
- **Muster 3** (dieselbe Bewegung für eine Landingpage): nicht Pults Aufgabe.
- **Muster 5** (Takt aus dem Ton): Erklärstücke haben standardmäßig keine Stimme (`CLAUDE.md`). Schlagzeiten gehören höchstens zu Musik und sind nicht dringend.
- **Muster 1 als Prompt** ("Schreib eine HTML-Szene…") wäre Stufe 2 und modellabhängig.

## Vorbehalte

1. **"Gleiche Eingabe, gleiches Bild" gilt nur auf derselben Maschine und im selben Browser.** Schrift- und Filterdarstellung unterscheiden sich zwischen Chromium, Safari und Firefox und zwischen Windows und macOS. Die Prüfsummen-Tests gelten also pro Umgebung, nicht als Beweis, dass es überall gleich aussieht.
2. **Dass sich `fromTo` bei `seek()` in anime.js genauso verhält wie in GSAP, ist nicht geprüft.** Der Abnahmetest (Bild zweimal und in anderer Reihenfolge) deckt es ab. Wer es vorher wissen will, testet es in zehn Zeilen.
3. **Die Gliederung springt von 6 auf 8** (Abschnitt 7 fehlt). Vermutlich fehlt dort etwas, zum Beispiel Ton.
4. Der Leitfaden zeigt, was **ein starkes Modell mit freiem Code** schafft, und deckt sich mit der Aussage der Reels. Er sagt nichts darüber, was ein günstiges Modell mit einem festen Katalog schafft. Das misst erst die Messung nach #14.

## Der Leitfaden im Wortlaut (Yannik, 2026-10-08)

> **Motion Graphics aus Code — Leitfaden**
> Wie man aus einer Beschreibung ein Video bekommt, ohne Videomodell, ohne Cloud, ohne Abo.
>
> **1 · Der Kern in einem Satz.** Eine Szene ist eine Funktion der Zeit. `render(t)` zeichnet das Bild zum Zeitpunkt `t`, sonst nichts. Kein Zustand, keine Wanduhr, keine Animation, die "läuft". Daraus folgt: Gleiche Eingabe, gleiches Bild. Jeder Frame ist einzeln anforderbar (man kann bei Frame 137 einsteigen, ohne 136 vorher). Fehler sind reproduzierbar (Frame 240 sieht falsch aus, dann schaut man sich Frame 240 an). Ein Titelwechsel rendert nicht das ganze Video neu.
>
> **2 · Die vier Stufen.** Beschreibung → Bühne (HTML + GSAP) → Frames (Playwright) → Film (ffmpeg). Stufe 1, Bühne: eine HTML-Datei mit allem, was man sieht; Schriften als Dateien eingebunden, nicht von Google geladen. Stufe 2, Zeitachse: GSAP baut eine Timeline, die man auf eine beliebige Zeit setzen kann. Der entscheidende Trick ist, dass sie anhält:
> ```js
> const DUR = 14;
> const tl = gsap.timeline({ paused: true });
> function render(t) { tl.seek(t); }
> ```
> Stufe 3, Frames: Ein Node-Skript öffnet die Seite im Kopflos-Browser und legt PNGs ab (bei 30 fps und 14 s sind das 420 Bilder). Stufe 4, Film: ffmpeg setzt die Bilder zusammen und legt Ton dazu.
>
> **3 · Das Gerüst.** `index.html` am Ende: `window.__motion = { DUR, render }`; der Parameter `?t=` nagelt die Animation für den Render fest, ohne ihn läuft sie im Browser als Vorschau. `render.mjs`: Seite öffnen (1920×1080), auf `window.__ready` und `document.fonts.ready` warten, für jedes Bild `render(i / FPS)` aufrufen und ein Bildschirmfoto speichern. Zwei Betriebsarten sind Pflicht: `probe` (acht Einzelbilder über den Film verteilt, nicht die ersten acht, Dauer Sekunden) und `full` (alle Frames; auf dem M4 420 Bilder ≈ 2,8 min). Nie direkt voll rendern. Kodieren: `ffmpeg -framerate 30 -i frames/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart film.mp4`.
>
> **4 · Die sechs Muster.**
> 1. *Szene als Code:* "Schreib eine HTML-Szene, die jeden Frame zu einem Zeitpunkt `t` zeichnen kann… Die Animation muss anhalten und auf `t` springen können, keine laufende Wiedergabe." Stolperstein: Ohne diesen Satz bekommt man `requestAnimationFrame` und nichts ist reproduzierbar.
> 2. *Titel, die sitzen:* Titel in Wörter zerlegen, jedes mit eigener Startzeit, Staffelung 4 Frames, 40 px Aufstieg aus einer Maske. 4 bis 6 Frames Versatz (133 bis 200 ms bei 30 fps) wirken rhythmisch. Die Maske muss höher sein als die Zeile, sonst verschwinden Unterlängen (bei 104 px Schrift 134 px Maske, `margin-bottom:-32px`).
> 3. *Bewegung für die Website:* dieselbe Animation zusätzlich als reines CSS/JS ohne GSAP, damit man die Bewegung nicht zweimal erfindet.
> 4. *Einführung aus einem Link:* Produktname, Merkmale und Handlungsaufruf von der Seite ziehen, **erst die Szenen planen**, dann bauen. 20 Sekunden.
> 5. *Takt aus dem Ton:* Schlagzeiten in Sekunden vorgeben, jeder Titel setzt auf einen Schlag. Alternativ Wort-Zeitstempel.
> 6. *Daten animieren:* CSV als Balkendiagramm; Balken wachsen, die Zahl zählt parallel hoch, beides aus demselben Fortschrittswert `p` (0 bis 1). Die Geometrie aus Daten rechnen, nicht setzen. Gewinn: nächste Woche neue Zahlen, gleicher Aufbau, neuer Film.
>
> **5 · Was in der Praxis schiefgeht.** Unterlängen abgeschnitten (Maske höher machen). Beschriftung vor ihrer Kurve sichtbar, weil `fromTo` Startwerte erst beim ersten Zeichnen festlegt und `seek()` darüber springt (alle Ausgangszustände mit `gsap.set()`, danach nur `.to()`). Render stockt, weil vollflächiges Korn mit `mix-blend-mode` und große Verläufe pro Frame eine neue Ebene erzwingen (gemessen 2,5 statt 7,5 Bilder/s). Browser startet nicht, wenn die Playwright-Version nicht zum installierten Browser passt. Text springt, wenn die Schrift zur Laufzeit nachgeladen wird (`document.fonts.ready` abwarten, Schriften lokal einbinden).
>
> **6 · Prüfliste vor dem Komplettlauf.** Probe gerendert (acht Bilder verteilt, angesehen). Kein Layout kollidiert. Unterlängen und Überhänge passen. Ausgangszustände explizit. Bilder eindeutig (Prüfsummen vergleichen; identische Nachbarbilder heißen, es bewegt sich nichts). Erst dann den Komplettlauf starten.
>
> **8 · Der Punkt.** Es gibt keinen Videogenerator. Es gibt eine HTML-Datei, einen kopflosen Browser und ffmpeg. Was man braucht, ist die Disziplin, jede Bewegung als Funktion der Zeit zu schreiben. Wer das einmal hat, kann Szenen tauschen wie Absätze.

*Der Wortlaut ist für diese Datei zusammengefasst, die Zahlen und Sätze stimmen mit dem Original überein. Das Original liegt bei Yannik.*
