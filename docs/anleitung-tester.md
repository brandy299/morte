# Pult ausprobieren: Schritt für Schritt

**Pult ist noch im Probelauf.** Es kann Fehler machen. Genau dafür brauchen wir dich. Rechne beim ersten Mal mit etwa 30 Minuten. Wenn etwas hakt: Unten steht die FAQ. Wenn die auch nicht hilft, mach ein Foto vom Bildschirm und schick es Yannik.

**Du brauchst kein Terminal.** Pult startest du mit einem Doppelklick.

---

## Teil 1: Einmal einrichten

### Schritt 1: Node.js installieren

Node.js ist ein kleines Hilfsprogramm, ohne das Pult nicht läuft. Du merkst später nichts davon.

1. Öffne **nodejs.org** im Browser.
2. Klicke auf den grünen Knopf mit **„LTS“** (nicht „Current“). Die Datei wird heruntergeladen.
3. Öffne die heruntergeladene Datei und klicke dich durch die Installation. Überall „Weiter“ oder „Continue“, alle Voreinstellungen lassen. Ein Passwort deines Computers wird eventuell abgefragt.

### Schritt 2: Pult entpacken

1. Yannik schickt dir einen Link oder eine **ZIP-Datei** („pult-…zip“). Lade sie herunter.
2. **Entpacken:**
   - **Windows:** Rechtsklick auf die Datei, **„Alle extrahieren“**, „Extrahieren“. (Nicht einfach in der ZIP öffnen, sondern wirklich entpacken.)
   - **Mac:** Doppelklick auf die Datei.
3. Es entsteht ein Ordner **„pult“**. Schiebe ihn nach **Dokumente**.

### Schritt 3: Einen Schlüssel besorgen

Pult braucht einen Zugang zu einer KI. Den bekommst du bei einem Anbieter. Wir empfehlen **OpenRouter**. Das ist wie eine **Prepaid-Karte für KI**: Du lädst einmal etwa **10 Dollar** auf (rund 9 bis 10 Euro), Pult verbraucht davon nur so viel, wie es braucht, und es gibt kein Abo. **Die ausführliche Anleitung mit Bildern steht in `docs/openrouter-anleitung.md`** (im Ordner „pult“, Unterordner „docs“). Die Gründe für die Empfehlung stehen in `docs/schluessel-empfehlung.md`. Wie viel du im Alltag verbrauchst, wissen wir noch nicht genau. Beobachte es in den ersten Wochen.

Kurz:
1. Gehe auf **openrouter.ai** und lege ein Konto an.
2. Lade unter **„Credits“** etwa **10 Dollar** auf.
3. Gehe zu **„API Keys“** und klicke auf **„New Key“**. **Wähle beim Erstellen eine Ausgabengrenze („Credit limit“, zum Beispiel 10 Dollar)** und bei „Expiration“ eine **längere Dauer als die voreingestellten 30 Tage**. Dann kann nie mehr abgebucht werden, und der Schlüssel läuft nicht nach einem Monat ab.
4. **Kopiere den Schlüssel sofort.** Er wird nur einmal angezeigt.

Ein Claude- oder ChatGPT-Abo funktioniert hier **nicht**. Es muss ein Schlüssel sein (siehe FAQ 5).

---

## Teil 2: Pult starten

### Schritt 4: Doppelklick

Öffne den Ordner „pult“ und starte:

- **Windows:** Doppelklick auf **„Pult starten“** (das Symbol sieht aus wie ein kleines Zahnrad oder Fenster, die Endung ist `.bat`).
  - Es kann ein blaues Fenster erscheinen: **„Der Computer wurde durch Windows geschützt“**. Klicke auf **„Weitere Informationen“** und dann auf **„Trotzdem ausführen“**. Das Programm ist von Yannik, es hat nur keine Firma dahinter.
- **Mac:** **Rechtsklick** auf **„Pult starten“**, dann **„Öffnen“**, dann im Fenster noch einmal **„Öffnen“**. Ein normaler Doppelklick wird beim ersten Mal vom Mac abgelehnt.
  - Klappt das nicht: **Systemeinstellungen**, **„Datenschutz & Sicherheit“**, ganz nach unten scrollen, bei „Pult starten“ auf **„Trotzdem öffnen“** klicken. Dann noch einmal versuchen.

Es öffnet sich ein **schwarzes Fenster** mit Text. Das ist normal und gehört dazu.

**Beim ersten Start** richtet sich Pult selbst ein. Das dauert **zwei bis fünf Minuten**. Es laufen viele Zeilen durch, auch gelbe Warnungen. Das ist normal. Warte einfach, bis „Pult läuft“ steht. Dann öffnet sich der **Browser** von selbst mit Pult.

**Lass das schwarze Fenster offen**, solange du mit Pult arbeitest. Wenn du es schließt, ist Pult aus.

Öffnet sich der Browser nicht, gib selbst diese Adresse ein: `http://localhost:3001`

### Schritt 5: Die Einrichtung in Pult

Pult führt dich durch.

1. Wähle **OpenRouter**.
2. Füge deinen **Schlüssel** ein (Strg + V, Mac: Cmd + V).
3. Das Modell ist schon ausgewählt. Lass es so.
4. Klicke auf **„Verbindung testen“**. Wenn es grün wird, speichere.

Dein Schlüssel wird im Schlüsselbund deines Computers abgelegt (oder in einer Datei nur für dich) und liegt nicht im Pult-Ordner.

### Schritt 6: Dein erstes Material

Schreib in das Eingabefeld, wie du es einer Kollegin sagen würdest. Zum Beispiel:

> Mach mir ein Arbeitsblatt zu Geschäftsbriefen für eine Handelsschule, 45 Minuten.

Pult fragt nach, wenn etwas fehlt. Du siehst, was gerade passiert. Das fertige PDF erscheint rechts in der Vorschau.

Tippst du im Eingabefeld einen **Schrägstrich `/`**, siehst du alle Anleitungen: Arbeitsblatt, Klausur, Reihe planen, Übung und weitere.

### Beenden und nächstes Mal

- **Beenden:** Schließe das schwarze Fenster.
- **Nächstes Mal:** Wieder Doppelklick auf „Pult starten“. Jetzt geht es in wenigen Sekunden. Mehr nicht.

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

**1. Es erscheint „Node.js ist noch nicht installiert“.**
Dann fehlt Schritt 1. Installiere Node.js von nodejs.org (Version „LTS“) und starte Pult noch einmal. Hilft das nicht: Computer neu starten, dann noch einmal.

**2. Es erscheint „Dein Node.js ist zu alt“.**
Installiere die aktuelle LTS-Version von nodejs.org (Schritt 1) und starte Pult noch einmal.

**3. Die Einrichtung beim ersten Start bricht ab, mit roten Zeilen.**
Starte „Pult starten“ noch einmal. Bleibt es: Mach ein Foto der **ersten roten Zeilen** und schick es Yannik. Häufige Ursache ist eine unterbrochene Internetverbindung. Im Schulnetz kann ein Schutzprogramm das Herunterladen blockieren. Versuche es zu Hause.

**4. Windows oder Mac lässt „Pult starten“ nicht zu.**
Siehe Schritt 4: Windows „Weitere Informationen“, „Trotzdem ausführen“. Mac Rechtsklick, „Öffnen“, oder Systemeinstellungen, „Datenschutz & Sicherheit“, „Trotzdem öffnen“. Auf dem Windows-Rechner einer Schule kann es sein, dass die IT das Ausführen verbietet. Dann geht es zu Hause.

**5. Kann ich mein Claude-Abo oder ChatGPT-Abo nehmen?**
Nein. Ein Abo ist kein Schlüssel. Du brauchst einen Schlüssel (API-Schlüssel), der getrennt abgerechnet wird. Anthropic erlaubt es Drittprogrammen nicht, Abo-Anmeldungen zu benutzen.

**6. Im Browser steht „Seite nicht erreichbar“.**
Läuft das schwarze Fenster noch? Wenn nicht, starte Pult neu (Schritt 4). Prüfe, dass die Adresse genau `http://localhost:3001` lautet.

**7. Das schwarze Fenster meldet, Pult laufe vielleicht schon.**
Pult läuft noch in einem anderen Fenster. Schließe es oder starte den Computer neu und versuche es noch einmal.

**8. „Verbindung testen“ wird rot.**
- Schlüssel noch einmal einfügen. Achte darauf, dass vorn und hinten kein Leerzeichen steht.
- Ist auf OpenRouter Guthaben da?
- Steht dort eine Ausgabengrenze, die schon erreicht ist?
- Im Schulnetz kann die Verbindung blockiert sein. Pult sagt dann meistens, woran es liegt. Probiere es zu Hause oder mit einem Handy-Hotspot.

**9. Das Verbindungstest-Ergebnis sagt, das Modell kann keine Bilder lesen.**
Pult braucht ein Modell, das Bilder versteht. Lass das vorausgewählte Modell stehen oder wähle ein anderes aus der empfohlenen Liste.

**10. Pult antwortet nicht mehr, oder bricht ab.**
Warte eine Minute, einige Anleitungen brauchen mehrere Minuten. Siehst du eine Fehlermeldung, klicke auf „Nochmal versuchen“ (falls vorhanden) oder schreibe „Bitte mach weiter“. Bei langen Gesprächen mit vielen Anhängen füllt sich das Gedächtnis (der Ring oben). Beginne dann ein neues Gespräch.

**11. Das PDF sieht seltsam aus oder die Aufgaben sind falsch.**
Das kann vorkommen. Klicke auf **„Passt nicht“** und schreibe kurz, was falsch ist. Genau das brauchen wir.

**12. Wie viel kostet das?**
Das wissen wir noch nicht genau. Das KI-Modell im Vorschlag kostet laut Preisliste 0,30 und 1,20 US-Dollar je eine Million Textstücke (Tokens), also wenig. Oben im Ring siehst du den Verbrauch und die geschätzten Kosten des Gesprächs. Die echte Rechnung findest du bei OpenRouter.

**13. Wo sind meine Dateien?**
In deinem Benutzerordner im Ordner `pult-daten`. Dort liegen Klassen, Material und Gespräche. Der Ordner „pult“ enthält deine Daten nicht. Du kannst ihn bei einer neuen Fassung austauschen.

**14. Eine neue Fassung von Pult kommt.**
Yannik schickt eine neue ZIP-Datei. Schließe Pult, entpacke die neue Fassung in einen **neuen** Ordner und starte dort „Pult starten“ (beim ersten Mal wieder mit der kurzen Einrichtung). Deine Daten bleiben erhalten. Den alten Ordner kannst du danach löschen.

**15. Ich möchte lieber das Terminal benutzen.**
Öffne im Ordner „pult“ ein Terminal (Windows: in die Adressleiste des Explorers `powershell` tippen und Enter; Mac: Terminal öffnen, `cd ` tippen, den Ordner hineinziehen, Enter). Dann `npm install` (nur beim ersten Mal) und `npm start`, danach im Browser `http://localhost:3001`. Meldet Windows, die Ausführung von Skripts sei deaktiviert, tippe einmal `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, bestätige mit `J`, und versuche es noch einmal.

**16. Ich komme nicht weiter.**
Schreib Yannik. Beim ersten Mal sitzt er gern dabei.
