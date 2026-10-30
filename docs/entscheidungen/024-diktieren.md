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

## Verworfen

- **Spracherkennung des Browsers:** Die Sprache ginge an Google oder Apple, Firefox kann es nicht, in Electron fehlt sie.
- **Über den KI-Anbieter:** Nicht jeder Anbieter kann es, und es widerspräche „Anbieter austauschbar“.

## Offen

- **Netz in Schulen:** Sperrt eine Schule `huggingface.co` oder `*.hf.co`, klappt das erste Laden nicht. Dann Modell mit ins Paket legen (Option „mitliefern“).
- **Paketgröße:** `@huggingface/transformers` zieht `onnxruntime-node` (ca. 550 MB) mit, das Pult nicht braucht. Prüfen, ob es sich ausschließen lässt, bevor das Zip für Kollegen wächst.
- **Genauigkeit und Tempo auf Schul-Laptops** mit echter deutscher Sprache messen; bei Bedarf `whisper-small` oder WebGPU.
- Safari ab 26 und Firefox, sowie das Aufnehmen im Electron-Fenster, sind nicht angesehen.
