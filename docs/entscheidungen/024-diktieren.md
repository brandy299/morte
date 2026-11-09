# 024: Diktieren im Eingabefeld, Whisper läuft im Browser

Datum: 2026-10-30 · Status: angenommen (Wahl von Yannik: lokal mit Whisper)

## Anlass

Lehrkräfte sollen Aufgaben für Pult sprechen können, statt zu tippen.

## Entscheidung

- **Mikrofon-Knopf im Eingabefeld.** Tippen startet die Aufnahme, noch einmal tippen beendet sie. Der erkannte Text landet im Feld, wird nicht automatisch gesendet und kann noch geändert werden.
- **Erkennung lokal im Browser:** Whisper (`onnx-community/whisper-base`, 8 Bit) über `@huggingface/transformers` 4.3.1 (Apache-2.0, exakt gepinnt) in einem Hintergrundprozess der Seite (`src/web/diktat.worker.ts`). Die Stimme verlässt den Rechner nicht, es hängt kein KI-Anbieter dran.
- **Die Laufzeit (WASM) liefert Pult selbst aus**, nicht ein CDN.
- **Das Sprachmodell (ca. 80 MB) wird beim ersten Diktieren einmal geladen** (huggingface.co und dessen Auslieferungsserver `*.hf.co`) und bleibt im Zwischenspeicher des Browsers. Fortschritt steht in einfacher Sprache neben dem Knopf. Beim Sprechen wird schon geladen.
- Sprache ist fest Deutsch. Aufnahme maximal fünf Minuten.

## Mikrofon-Auswahl (2026-11-07, Version 0.2.9)

Auf einem Windows-PC in der Desktop-App ging das Diktieren nicht, und es gab keine Möglichkeit, das Mikrofon zu wählen. Darum:

- **Einstellungen, Reiter „Mikrofon“:** Auswahl der Eingänge (Namen erscheinen nach dem ersten Test), Test mit Lautstärke-Balken („Ich höre dich“). Die Wahl steht im Speicher der Seite (`localStorage`), pro Computer. Ist das gewählte Mikrofon weg, nimmt Pult wieder das des Computers.
- **Stille Aufnahme:** Hört das Mikrofon gar nichts (Spitze unter 0,01), sagt Pult das und verweist auf die Auswahl, statt Whisper auf Stille loszulassen.
- **Klare Meldungen:** Windows-Sperre (Datenschutz, Mikrofon, Desktop-Apps), Mikrofon von Teams oder Zoom belegt, keins gefunden. Bei einem Fehler der Spracherkennung steht die Ursache in der Meldung (Foto an Yannik).
- **Desktop-App:** Knopf „Windows-Einstellungen öffnen“ (`ms-settings:privacy-microphone`) über eine eigene Tür im Programm; die Rechte für Mikrofon gelten nur für Pults eigene Seite (Abfrage und Anfrage).
- **Nicht prüfbar in der Entwicklungsumgebung:** Windows selbst und der Windows-Schalter für Desktop-Apps. Der Ablauf wurde in Chromium mit Testgeräten geprüft.

## Verworfen

- **Spracherkennung des Browsers:** Die Sprache ginge an Google oder Apple, Firefox kann es nicht, in Electron fehlt sie.
- **Über den KI-Anbieter:** Nicht jeder Anbieter kann es, und es widerspräche „Anbieter austauschbar“.

## Offen

- **Netz in Schulen:** Sperrt eine Schule `huggingface.co` oder `*.hf.co`, klappt das erste Laden nicht. Dann Modell mit ins Paket legen (Option „mitliefern“).
- **Paketgröße:** `@huggingface/transformers` zieht `onnxruntime-node` (ca. 550 MB) mit, das Pult nicht braucht. Prüfen, ob es sich ausschließen lässt, bevor das Zip für Kollegen wächst.
- **Genauigkeit und Tempo auf Schul-Laptops** messen; bei Bedarf `whisper-small` oder WebGPU. Erster Lauf (2026-10-30, Chromium auf Linux, Telefonaufnahme mit Rauschen, 8 Sekunden Sprache): Modell geladen, Text nach unter einer Minute inklusive Download, Satz bis auf die letzten Wörter richtig ("wie kann ich das tun" wurde zu "Wir können nicht das tun").
- Safari ab 26 und Firefox, sowie das Aufnehmen im Electron-Fenster, sind nicht angesehen.
