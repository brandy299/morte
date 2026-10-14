# Pult ausprobieren: Schritt für Schritt

**Pult ist noch im Probelauf.** Es kann Fehler machen. Genau dafür brauchen wir dich. Rechne beim ersten Mal mit etwa 30 Minuten. Wenn etwas hakt: Unten steht die FAQ. Wenn die auch nicht hilft, mach ein Foto vom Bildschirm und schick es Yannik.

Du brauchst nur **eine Zeile**, die du in ein Fenster einfügst. Mehr musst du nicht tippen.

---

## Teil 1: Einmal vorbereiten

### Schritt 1: Nichts zu tun

Pult braucht ein kleines Hilfsprogramm namens Node.js. Die Zeile aus Schritt 4 holt es selbst, falls es auf deinem Computer fehlt (rund 40 MB, ohne Installation und ohne Passwort). Du musst dafür nirgends hin.

### Schritt 2: Einen Schlüssel besorgen

Pult braucht einen Zugang zu einer KI. Den bekommst du bei einem Anbieter. Wir empfehlen **OpenRouter**. Das ist wie eine **Prepaid-Karte für KI**: Du lädst einmal etwa **10 Dollar** auf (rund 9 bis 10 Euro), Pult verbraucht davon nur so viel, wie es braucht, und es gibt kein Abo. **Die ausführliche Anleitung mit Bildern: [OpenRouter einrichten](openrouter-anleitung.md)** (im Pult-Ordner die Datei „OpenRouter einrichten“, oder auf github.com/brandy299/morte unter „docs“). Wie viel du im Alltag verbrauchst, wissen wir noch nicht genau. Beobachte es in den ersten Wochen.

1. Gehe auf **openrouter.ai** und lege ein Konto an.
2. Lade unter **„Credits“** etwa **10 Dollar** auf.
3. Gehe zu **„API Keys“** und klicke auf **„New Key“**. **Wähle beim Erstellen eine Ausgabengrenze („Credit limit“, zum Beispiel 10 Dollar)** und bei „Expiration“ eine **längere Dauer als die voreingestellten 30 Tage**. Dann kann nie mehr abgebucht werden, und der Schlüssel läuft nicht nach einem Monat ab.
4. **Kopiere den Schlüssel sofort.** Er wird nur einmal angezeigt.

Ein Claude- oder ChatGPT-Abo funktioniert hier **nicht**. Es muss ein Schlüssel sein (siehe FAQ 5).

---

## Teil 2: Pult holen und starten

### Schritt 3: Das Terminal öffnen

Das Terminal ist ein Fenster, in das man Befehle einfügt. Du musst nichts verstehen, nur eine Zeile einfügen.

- **Windows:** Klicke auf das **Startmenü**, tippe **PowerShell** und drücke Enter. Ein blaues Fenster geht auf.
- **Mac:** Drücke **Cmd + Leertaste**, tippe **Terminal** und drücke Enter. Ein Fenster mit Text geht auf.

### Schritt 4: Die Zeile einfügen

Kopiere die Zeile für dein System, füge sie im Terminal ein (Windows: Rechtsklick ins Fenster oder Strg + V, Mac: Cmd + V) und drücke **Enter**:

- **Windows (PowerShell):**
  ```
  irm https://raw.githubusercontent.com/brandy299/morte/main/install.ps1 | iex
  ```
- **Mac (Terminal):**
  ```
  curl -fsSL https://raw.githubusercontent.com/brandy299/morte/main/install.sh | bash
  ```

Pult wird jetzt heruntergeladen und richtet sich selbst ein. Das dauert **zwei bis fünf Minuten**. Es laufen viele Zeilen durch, auch gelbe Warnungen. Das ist normal. Warte einfach, bis „Pult läuft“ steht. Dann öffnet sich der **Browser** von selbst mit Pult.

**Lass das Terminal-Fenster offen**, solange du mit Pult arbeitest. Wenn du es schließt, ist Pult aus. Öffnet sich der Browser nicht, gib selbst diese Adresse ein: `http://localhost:3001`

Pult liegt danach im Ordner **„Pult“** in deinem Benutzerordner. **Lege dort keine eigenen Dateien ab**: Bei einem Update wird der Ordner erneuert. Deine Klassen, dein Material und deine Gespräche liegen getrennt im Ordner „pult-daten“ und bleiben erhalten.

### Schritt 5: Die Einrichtung in Pult

Pult führt dich durch.

1. **OpenRouter** ist schon ausgewählt. Lass es so.
2. Füge deinen **Schlüssel** ein (Strg + V, Mac: Cmd + V). Meldet Pult, dein Schlüssel gehöre zu einem anderen Anbieter, wähle oben den genannten Anbieter.
3. Das Modell ist schon ausgewählt. Lass es so.
4. Klicke auf **„Verbindung testen“**. Wenn es grün wird, speichere.

Dein Schlüssel wird im Schlüsselbund deines Computers abgelegt (oder in einer Datei nur für dich) und liegt nicht im Pult-Ordner.

### Schritt 6: Dein erstes Material

Schreib in das Eingabefeld, wie du es einer Kollegin sagen würdest. Zum Beispiel:

> Mach mir ein Arbeitsblatt zu Geschäftsbriefen für eine Handelsschule, 45 Minuten.

Pult stellt dir zuerst **ein paar Rückfragen** (meist drei), zum Beispiel zur Klasse oder zum Schwerpunkt. Zu jeder Frage gibt es eine **Empfehlung mit Begründung**. Passt sie, klicke auf **„Weiter“**. Hast du keine Lust, jede Frage zu beantworten, klicke auf **„Alle Empfehlungen übernehmen“**. Danach arbeitet Pult, und du siehst, was gerade passiert. Das dauert etwa ein bis zwei Minuten. Das fertige Blatt erscheint rechts in der Vorschau, das **Lösungsblatt für dich** daneben unter „Lösung“. Darunter stehen Knöpfe wie „Kürzer“, „Leichter“ oder „Als Word“.

**Tipp:** Wechsle ruhig in ein anderes Fenster, während Pult arbeitet. Wenn du in den **Einstellungen** unter „Aussehen“ **„Mitteilung, wenn ich fertig bin“** einschaltest, meldet sich Pult, sobald das Material fertig ist oder es eine Rückfrage hat. Unten am Eingabefeld siehst du, **welche KI** gerade arbeitet (Klick für Preis und Gedächtnis). Gespräche kannst du über das **Ordner-Symbol** in der Seitenleiste in **Projekte** sortieren.

Tippst du im Eingabefeld einen **Schrägstrich `/`**, siehst du alle Anleitungen: Arbeitsblatt, Klausur, Reihe planen, Übung und weitere.

### Beenden und nächstes Mal

- **Beenden:** Schließe das Terminal-Fenster.
- **Nächstes Mal:** Öffne den Ordner **„Pult“** in deinem Benutzerordner und mache einen **Doppelklick auf „Pult starten“**. Jetzt geht es in wenigen Sekunden. (Du kannst auch einfach die Zeile aus Schritt 4 noch einmal einfügen. Das holt zugleich die neueste Fassung.)

---

## Teil 3: Dein Eindruck

Schreib uns auf, was gut und was schlecht war. Das hilft mehr als alles andere.

- Unter **jedem Material** gibt es **„Passt“** und **„Passt nicht“**. Bei „Passt nicht“ kannst du kurz sagen, warum.
- Oben im Gespräch: **„Gespräch exportieren“** speichert alles als Textdatei. **Lies sie vorher durch**: Es darf kein Schülername und keine Note drin stehen.
- In den **Einstellungen** kannst du deine Rückmeldungen exportieren, ohne den Gesprächstext.
- Schick die Dateien an Yannik.

**Datenschutz:** Keine Schülernamen, keine Noten, keine Fotos von Klassenarbeiten, weder im Gespräch noch in Anhängen. Deine Eingaben und angehängten Dateien gehen an den KI-Anbieter (hier OpenRouter und das gewählte Modell). Klassen, Material und Gespräche bleiben auf deinem Computer in einem Ordner namens `pult-daten` in deinem Benutzerordner.

---

## FAQ: Wenn etwas nicht klappt

**1. Es erscheint „Der Download von Node.js hat nicht geklappt“ oder „Dieses System kenne ich nicht“.**
Dann konnte Pult das Hilfsprogramm nicht selbst holen. Häufige Ursache ist eine gesperrte Seite im Schulnetz oder eine unterbrochene Verbindung. Versuche es zu Hause noch einmal. Alternativ installierst du Node.js von nodejs.org (grüner Knopf „LTS“, überall „Weiter“), **schließt das Terminal, öffnest es neu** (Schritt 3) und fügst die Zeile aus Schritt 4 noch einmal ein.

**2. Es erscheint „Dein Node.js ist zu alt“.**
Das sollte nicht mehr vorkommen, denn die Zeile holt dann selbst eine passende Version. Erscheint es trotzdem, installiere die aktuelle LTS-Version von nodejs.org, öffne ein neues Terminal und füge die Zeile aus Schritt 4 noch einmal ein.

**3. Die Einrichtung beim ersten Start bricht ab, mit roten Zeilen.**
Füge die Zeile aus Schritt 4 noch einmal ein. Bleibt es: Mach ein Foto der **ersten roten Zeilen** und schick es Yannik. Häufige Ursache ist eine unterbrochene Internetverbindung. Im Schulnetz kann ein Schutzprogramm das Herunterladen blockieren. Versuche es zu Hause.

**4. Ich habe eine ZIP-Datei bekommen, und Windows oder der Mac lässt „Pult starten“ nicht zu.**
Das ist der zweite Weg (statt der Zeile aus Schritt 4): Entpacke die ZIP-Datei (Windows: Rechtsklick, „Alle extrahieren“; Mac: Doppelklick), öffne den Ordner „pult“ und starte **„Pult starten“** mit einem Doppelklick.
- **Windows:** Kommt ein blaues Fenster „Der Computer wurde durch Windows geschützt“, klicke auf **„Weitere Informationen“** und dann auf **„Trotzdem ausführen“**.
- **Mac:** Es erscheint „‚Pult starten.command‘ nicht geöffnet“. Klicke auf **„Fertig“** (nicht auf „In den Papierkorb legen“). Öffne dann das **Apfel-Menü**, **„Systemeinstellungen“**, **„Datenschutz & Sicherheit“**, scrolle ganz nach unten und klicke bei „Pult starten.command“ auf **„Trotzdem öffnen“** (je nach Version „Dennoch öffnen“). Gib dein Passwort oder Touch ID ein und klicke auf „Öffnen“. Das ist einmalig. Findest du den Knopf nicht: Öffne das **Terminal**, tippe `xattr -dr com.apple.quarantine ` (mit einem Leerzeichen am Ende), ziehe den Ordner „pult“ in das Fenster und drücke Enter. Danach „Pult starten“ doppelklicken.

Mit der Zeile aus Schritt 4 kommt diese Warnung gar nicht erst. Auf dem Windows-Rechner einer Schule kann es sein, dass die IT das Ausführen verbietet. Dann geht es zu Hause.

**5. Kann ich mein Claude-Abo oder ChatGPT-Abo nehmen?**
Nein. Ein Abo ist kein Schlüssel. Du brauchst einen Schlüssel (API-Schlüssel), der getrennt abgerechnet wird. Anthropic erlaubt es Drittprogrammen nicht, Abo-Anmeldungen zu benutzen.

**6. Im Browser steht „Seite nicht erreichbar“.**
Läuft das Terminal-Fenster noch? Wenn nicht, starte Pult neu (Doppelklick auf „Pult starten“ im Ordner „Pult“ oder die Zeile aus Schritt 4). Prüfe, dass die Adresse genau `http://localhost:3001` lautet.

**7. Das Terminal-Fenster meldet, Pult laufe vielleicht schon.**
Pult läuft noch in einem anderen Fenster. Schließe es oder starte den Computer neu und versuche es noch einmal.

**8. „Verbindung testen“ wird rot.**
- Schlüssel noch einmal einfügen. Er beginnt bei OpenRouter mit `sk-or-`.
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
Schließe Pult (das Terminal-Fenster) und füge die Zeile aus Schritt 4 noch einmal ein. Sie holt die neueste Fassung, die Einrichtung geht dann schnell. Deine Daten im Ordner „pult-daten“ bleiben erhalten.

**15. Im Terminal erscheint „irm wird nicht erkannt“, „curl: command not found“ oder „Der Download hat nicht geklappt“.**
- „irm … nicht erkannt“ heißt: Du hast die **Eingabeaufforderung** (schwarz) statt der **PowerShell** (blau) geöffnet. Öffne im Startmenü die PowerShell (Schritt 3).
- „Der Download hat nicht geklappt“: Prüfe deine Internetverbindung. In manchen Schulnetzen ist der Zugriff auf github.com gesperrt. Probiere es zu Hause oder mit einem Handy-Hotspot.
- Klappt die Zeile gar nicht, schick Yannik ein Foto vom Fenster. Er kann dir stattdessen eine ZIP-Datei schicken (siehe FAQ 4).

**16. Ich komme nicht weiter, oder ich will einen Fehler melden.**
Schreib Yannik. Nenne dazu die **Version**: in Pult unten bei den Einstellungen steht „Pult 0.1.0 (Probelauf), Stand …“. Beim ersten Mal sitzt er gern dabei.
