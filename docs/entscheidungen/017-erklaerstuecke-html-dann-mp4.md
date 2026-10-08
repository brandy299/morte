# 017: Erklärstücke und Motion Graphics: erst HTML, danach MP4 aus derselben Animation

Stand: 2026-10-08 · beantwortet #15 · Grundlage: `docs/recherche/bewegtbild.md`

## Entscheidung

1. **Zuerst die HTML-Datei (#14).** Ein Erklärstück ist eine einzelne `.html`-Datei, die ohne Internet im Browser läuft (Beamer, Schul-PC). Das Modell liefert die Szenenbeschreibung, Pult baut Look, Takt und Layout.
2. **MP4 kommt danach, aus derselben Animation.** Yannik: Motion Graphics sind für das Projekt ein großes Thema, MP4 wird wahrscheinlich gebraucht (zum Hochladen und Weitergeben, später auch für Moodle). Deshalb wird die HTML-Fassung so gebaut, dass daraus Bilder und ein Video entstehen können:
   - **Eine Zeitleiste mit `seek(t)`** (anime.js, MIT): Jeder Zeitpunkt lässt sich einzeln abbilden. Dasselbe Programm spielt die Animation im Browser ab und liefert später jedes Bild für den Export.
   - **Keine Zufallswerte und keine Uhr im Bild:** Gleiche Beschreibung, gleiche Bilder (Abnahmekriterium 2 aus #14).
   - **Nichts aus dem Netz.** Schriften und Bibliothek stecken in der Datei.
3. **Kodieren im Browser statt mit FFmpeg.** Für MP4 wird das Bild für Bild gezeichnete Video mit dem Kodierer des Browsers (WebCodecs) und `mp4-muxer` (MIT) zusammengesetzt. Das braucht keine Zusatzinstallation (Entscheidung 002) und keinen Lizenzkompromiss.
4. **Nicht gewählt:**
   - HyperFrames: braucht Node 22+, FFmpeg und Headless-Chrome auf dem Rechner jeder Lehrkraft.
   - `ffmpeg-static`: GPL-3.0, passt nicht zu Apache-2.0. `@ffmpeg-installer/ffmpeg`: Lizenz der enthaltenen Programme ungeprüft.
   - GSAP (keine freie Lizenz), p5.js und p5.brush (LGPL-2.1).

## Was noch geprüft werden muss, bevor MP4 gebaut wird

- **H.264 im Kodierer von Electron** auf Mac und Windows (Phase 6). Ohne das bleibt als Ausweg WebM, das Moodle und die meisten Browser ebenfalls abspielen, PowerPoint aber nicht.
- **Rechenzeit:** Die Probe brauchte rund 0,8 Sekunden je Bild bei 1280×720 (hochgerechnet 3,5 Minuten für 9 Sekunden bei 30 Bildern pro Sekunde, nicht gemessen). Die Wasserfarben-Filter sind teuer, eventuell müssen Ebenen vorab zu Bildern gerechnet werden.
- **Moodle:** Ob und wie Moodle Videos und HTML-Inhalte aufnimmt (Video-Datei, SCORM, H5P), klärt der spätere eigene Workflow. Die Schule testet Moodle noch.

## Folgen

- ROADMAP, Phase 5: Die Zeile „Erklärvideos über die bestehende Render-Pipeline“ ist umformuliert. Eine bestehende Pipeline gibt es in Pult nicht.
- #14 bleibt auf HTML begrenzt und blockiert nicht auf MP4. MP4 bekommt ein eigenes Issue, sobald das Erklärstück steht und H.264 in Electron geprüft ist.
- Eine Stimme gibt es nur auf ausdrücklichen Wunsch (CLAUDE.md).
