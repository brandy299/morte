# Pult ausprobieren: Schritt für Schritt

**Pult ist noch im Probelauf.** Es kann Fehler machen. Genau dafür brauchen wir dich. Rechne beim ersten Mal mit etwa 30 Minuten. Wenn etwas hakt: Unten steht die FAQ. Wenn die auch nicht hilft, mach ein Foto vom Bildschirm und schick es Yannik.

Alles, was du eintippst, steht in grauen Kästen. **Du tippst es genau so ein und drückst danach die Enter-Taste.** Du musst nichts verstehen, nur abtippen oder kopieren.

---

## Teil 1: Einmal einrichten

### Schritt 1: Node.js installieren

Node.js ist ein kleines Hilfsprogramm, ohne das Pult nicht startet. Du merkst später nichts davon.

1. Öffne **nodejs.org** im Browser.
2. Klicke auf den grünen Knopf mit **„LTS“** (nicht „Current“). Die Datei wird heruntergeladen.
3. Öffne die heruntergeladene Datei und klicke dich durch die Installation. Überall „Weiter“ oder „Continue“, alle Voreinstellungen lassen. Ein Passwort deines Computers wird eventuell abgefragt.
4. **Starte den Computer nicht neu, aber schließe alle offenen Terminal-Fenster.**

Ob es geklappt hat, siehst du in Schritt 3.

### Schritt 2: Den Pult-Ordner holen

1. Yannik schickt dir eine **ZIP-Datei** („pult.zip“ oder ähnlich). Speichere sie.
2. **Entpacken:**
   - **Windows:** Rechtsklick auf die Datei, „Alle extrahieren“, „Extrahieren“.
   - **Mac:** Doppelklick auf die Datei.
3. Verschiebe den entstandenen Ordner nach **Dokumente**. Der Ordner heißt zum Beispiel „pult“.

### Schritt 3: Das Terminal öffnen

Das Terminal ist ein Fenster, in das man Befehle tippt.

- **Windows:** Öffne den Ordner „pult“ im Explorer. Klicke oben in die Adressleiste (dort, wo der Pfad steht), tippe `powershell` und drücke Enter. Ein blaues Fenster geht auf. Das ist das Terminal, und es steht schon im richtigen Ordner.
- **Mac:** Öffne das Programm **Terminal** (Spotlight mit Cmd + Leertaste, „Terminal“ tippen). Tippe `cd ` (mit Leerzeichen dahinter), **ziehe den Ordner „pult“ aus dem Finder in das Terminal-Fenster** und drücke Enter.

**Prüfen, ob Node da ist.** Tippe:

```
node -v
```

Es muss eine Zahl mit **v22** oder höher erscheinen, zum Beispiel `v22.11.0`. Steht dort eine kleinere Zahl oder „nicht gefunden“, siehe FAQ 1 und 2.

### Schritt 4: Pult aufbauen

Tippe nacheinander, und warte jeweils, bis es fertig ist (du siehst wieder die Eingabezeile):

```
npm install
```

Das dauert **zwei bis fünf Minuten**. Es laufen viele Zeilen durch, auch gelbe Warnungen. Das ist normal. Rot und „ERR!“ ist nicht normal (siehe FAQ 3).

```
npm run build
```

Das dauert etwa eine Minute.

Beide Befehle brauchst du **nur beim ersten Mal**.

### Schritt 5: Einen Schlüssel besorgen

Pult braucht einen Zugang zu einer KI. Den bekommst du bei einem Anbieter. Wir empfehlen **OpenRouter**. Die Gründe stehen in `docs/schluessel-empfehlung.md`. Die Kosten liegen im Cent-Bereich pro Material, der genaue Alltagsverbrauch ist noch nicht bekannt.

1. Gehe auf **openrouter.ai** und lege ein Konto an.
2. Lade unter **„Credits“** etwa **10 Euro** auf.
3. Gehe zu **„Keys“** und erstelle einen neuen Schlüssel. **Setze beim Erstellen eine Ausgabengrenze** (zum Beispiel 10 Dollar). Dann kann nie mehr abgebucht werden.
4. **Kopiere den Schlüssel sofort.** Er wird nur einmal angezeigt.

Ein Claude- oder ChatGPT-Abo funktioniert hier **nicht**. Es muss ein Schlüssel sein (siehe FAQ 8).

---

## Teil 2: Pult starten

### Schritt 6: Starten

Im Terminal (im Pult-Ordner, siehe Schritt 3):

```
npm start
```

Es erscheint ein Text, der etwa sagt, dass Pult läuft. **Lass dieses Fenster offen.** Wenn du es schließt, ist Pult aus.

Öffne jetzt im Browser (Chrome oder Edge am besten):

```
http://localhost:3001
```

### Schritt 7: Die Einrichtung

Pult führt dich durch.

1. Wähle **OpenRouter**.
2. Füge deinen **Schlüssel** ein (Strg + V, Mac: Cmd + V).
3. Das Modell ist schon ausgewählt. Lass es so.
4. Klicke auf **„Verbindung testen“**. Wenn es grün wird, speichere.

Dein Schlüssel wird im Schlüsselbund deines Computers abgelegt (oder in einer Datei nur für dich) und liegt nicht im Pult-Ordner.

### Schritt 8: Dein erstes Material

Schreib in das Eingabefeld, wie du es einer Kollegin sagen würdest. Zum Beispiel:

> Mach mir ein Arbeitsblatt zu Geschäftsbriefen für eine Handelsschule, 45 Minuten.

Pult fragt nach, wenn etwas fehlt. Du siehst, was gerade passiert. Das fertige PDF erscheint rechts in der Vorschau.

Tippst du im Eingabefeld einen **Schrägstrich `/`**, siehst du alle Anleitungen: Arbeitsblatt, Klausur, Reihe planen, Übung und weitere.

### Beenden und nächstes Mal

- **Beenden:** Im Terminal-Fenster **Strg + C** drücken (auch auf dem Mac Ctrl + C), dann das Fenster schließen.
- **Nächstes Mal:** Terminal im Pult-Ordner öffnen (Schritt 3), `npm start` tippen, Browser auf `http://localhost:3001`. Mehr nicht.

---

## Teil 3: Dein Eindruck

Schreib uns auf, was gut und was schlecht war. Das hilft mehr als alles andere.

- Unter **jedem Material** gibt es **„Passt“** und **„Passt nicht“**. Bei „Passt nicht“ kannst du kurz sagen, warum.
- Oben im Gespräch: **„Gespräch exportieren“** speichert alles als Textdatei. **Lies sie vorher durch**: Es darf kein Schülername und keine Note drin stehen.
- In den **Einstellungen** kannst du deine Rückmeldungen exportieren, ohne den Gesprächstext.
- Schick die Dateien an Yannik. Der Rückmeldebogen `probelauf-rueckmeldebogen.docx` ist optional.

**Datenschutz:** Keine Schülernamen, keine Noten, keine Fotos von Klassenarbeiten, weder im Gespräch noch in Anhängen. Deine Eingaben und angehängten Dateien gehen an den KI-Anbieter (hier OpenRouter und das gewählte Modell). Klassen, Material und Gespräche bleiben auf deinem Computer in einem Ordner namens `pult-daten` in deinem Benutzerordner.

---

## FAQ: Wenn etwas nicht klappt

**1. `node -v` zeigt „nicht gefunden“ / „not recognized“.**
Das Terminal kennt Node noch nicht. Schließe das Terminal ganz, öffne es neu (Schritt 3) und versuche es noch einmal. Hilft das nicht: Computer neu starten, dann noch einmal. Hilft das nicht: Node.js neu installieren (Schritt 1).

**2. `node -v` zeigt eine Zahl unter v22 (zum Beispiel v18 oder v20).**
Dein Node ist zu alt. Installiere die aktuelle LTS-Version von nodejs.org (Schritt 1), öffne ein neues Terminal und prüfe noch einmal.

**3. Bei `npm install` erscheint rot „ERR!“.**
Starte `npm install` einmal neu. Bleibt es: Mach ein Foto der **ersten roten Zeilen** und schick es Yannik. Häufige Ursache ist eine unterbrochene Internetverbindung. Im Schulnetz kann ein Schutzprogramm das Herunterladen blockieren. Versuche es zu Hause.

**4. Windows: „Die Ausführung von Skripts ist auf diesem System deaktiviert“ (rot, bei `npm`).**
Windows verbietet PowerShell bestimmte Programme. Tippe einmalig:
```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Bestätige mit `J` und Enter. Dann den Befehl noch einmal. Alternativ im Explorer statt `powershell` das Wort `cmd` in die Adressleiste tippen, dort tritt das Problem nicht auf.

**5. Mac: „Der Befehl npm wurde nicht gefunden“ oder eine Meldung zu Entwicklerwerkzeugen.**
Terminal schließen und neu öffnen. Kommt die Meldung weiter, installiere Node.js noch einmal (Schritt 1). Fragt der Mac, ob er „Command Line Tools“ installieren soll, bestätige das und warte. Das kann ein paar Minuten dauern.

**6. Im Browser steht „Seite nicht erreichbar“.**
Läuft das Terminal-Fenster noch mit `npm start`? Wenn nicht, starte neu (Schritt 6). Prüfe, dass die Adresse genau `http://localhost:3001` lautet.

**7. `npm start` meldet, der Anschluss (Port) 3001 sei schon belegt.**
Pult läuft noch in einem anderen Fenster. Schließe die anderen Terminal-Fenster oder starte den Computer neu. Wenn du es anders brauchst:
- Windows PowerShell: `$env:PORT=3002; npm start`, Adresse dann `http://localhost:3002`
- Mac: `PORT=3002 npm start`

**8. Kann ich mein Claude-Abo oder ChatGPT-Abo nehmen?**
Nein. Ein Abo ist kein Schlüssel. Du brauchst einen Schlüssel (API-Schlüssel), der getrennt abgerechnet wird. Anthropic erlaubt es Drittprogrammen nicht, Abo-Anmeldungen zu benutzen.

**9. „Verbindung testen“ wird rot.**
- Schlüssel noch einmal einfügen. Achte darauf, dass vorn und hinten kein Leerzeichen steht.
- Ist auf OpenRouter Guthaben da?
- Steht dort eine Ausgabengrenze, die schon erreicht ist?
- Im Schulnetz kann die Verbindung blockiert sein. Pult sagt dann meistens, woran es liegt. Probiere es zu Hause oder mit einem Handy-Hotspot.

**10. Das Verbindungstest-Ergebnis sagt, das Modell kann keine Bilder lesen.**
Pult braucht ein Modell, das Bilder versteht. Lass das vorausgewählte Modell stehen oder wähle ein anderes aus der empfohlenen Liste.

**11. Pult antwortet nicht mehr, oder bricht ab.**
Warte eine Minute, einige Anleitungen brauchen mehrere Minuten. Siehst du eine Fehlermeldung, klicke auf „Nochmal versuchen“ (falls vorhanden) oder schreibe „Bitte mach weiter“. Bei langen Gesprächen mit vielen Anhängen füllt sich das Gedächtnis (der Ring oben). Beginne dann ein neues Gespräch.

**12. Das PDF sieht seltsam aus oder die Aufgaben sind falsch.**
Das kann vorkommen. Klicke auf **„Passt nicht“** und schreibe kurz, was falsch ist. Genau das brauchen wir.

**13. Wie viel kostet das?**
Das wissen wir noch nicht genau. Das KI-Modell im Vorschlag kostet laut Preisliste 0,30 und 1,20 US-Dollar je eine Million Textstücke (Tokens), also wenig. Oben im Ring siehst du den Verbrauch und die geschätzten Kosten des Gesprächs. Die echte Rechnung findest du bei OpenRouter.

**14. Wo sind meine Dateien?**
In deinem Benutzerordner im Ordner `pult-daten`. Dort liegen Klassen, Material und Gespräche. Der Pult-Programmordner enthält deine Daten nicht. Du kannst ihn bei einer neuen Fassung austauschen.

**15. Eine neue Fassung von Pult kommt.**
Yannik schickt eine neue ZIP-Datei. Beende Pult, entpacke sie in einen neuen Ordner und führe dort `npm install` und `npm run build` aus. Deine Daten bleiben erhalten.

**16. Ich kann das Terminal nicht öffnen / ich komme nicht weiter.**
Schreib Yannik. Beim ersten Mal sitzt er gern dabei.
