# OpenRouter einrichten: Schritt für Schritt

Stand: 2026-10-14. OpenRouter ist ein Zugang zu vielen KI-Modellen mit **einem** Konto, **einem** Guthaben und **einem** Schlüssel. Pult nutzt es, um Material zu erstellen. Du brauchst etwa 10 Minuten und eine Zahlungsart (Karte, PayPal oder was OpenRouter gerade anbietet).

**Zu den Bildern:** Die Seiten von OpenRouter sind erst nach der Anmeldung sichtbar. Ich konnte sie nicht selbst aufnehmen. Bei jedem Schritt steht deshalb, **was du siehst und worauf du klickst**. Wenn du Bilder ergänzen willst, lege sie in `docs/bilder/openrouter/` ab (Namen stehen bei den Schritten) und verweise hier darauf. **Achtung:** Auf Bildern darf nie ein echter Schlüssel zu sehen sein.

Die Bezeichnungen können sich ändern. Die Schritte beruhen auf der Dokumentation von OpenRouter (openrouter.ai/docs, am 2026-10-14 gelesen), die Oberfläche selbst habe ich nicht gesehen. Weicht etwas ab, such das Wort in der Seitenleiste.

---

## Schritt 1: Konto anlegen

1. Öffne **openrouter.ai** im Browser.
2. Klicke oben rechts auf **„Sign in“** (Anmelden).
3. Melde dich mit Google, GitHub oder deiner E-Mail-Adresse an.
4. Bestätige gegebenenfalls deine E-Mail-Adresse über den Link in der Mail.

*Bild: `01-anmelden.png` (Startseite mit „Sign in“ oben rechts)*

## Schritt 2: Guthaben aufladen

OpenRouter arbeitet mit Guthaben („Credits“). Das Guthaben wird beim Benutzen verbraucht. Es gibt kein Abo.

1. Klicke oben rechts auf dein **Profilbild** und dann auf **„Credits“**.
2. Klicke auf **„Add Credits“** (Guthaben hinzufügen).
3. Gib einen Betrag ein. **Für den Anfang reichen 10 Dollar.** Zahle mit deiner Zahlungsart.
4. **Automatisches Aufladen (Auto Top-up) lässt du ausgeschaltet.** Sonst wird nachgeladen, ohne dass du es merkst.

Gut zu wissen:
- Beim Aufladen berechnet OpenRouter eine **Gebühr**. Die Höhe siehst du vor der Zahlung.
- Beim Benutzen zahlst du laut OpenRouter dieselben Preise wie beim Anbieter des Modells, ohne Aufschlag.
- Unbenutztes Guthaben **kann nach einem Jahr verfallen** (Bedingungen von OpenRouter). Lade also nicht zu viel auf einmal auf.
- Die Rechnung kommt in **US-Dollar**.

*Bild: `02-credits.png` (Seite „Credits“ mit „Add Credits“)*

## Schritt 3: Schlüssel erstellen, mit Ausgabengrenze

Der Schlüssel ist eine lange Zeichenfolge, mit der sich Pult bei OpenRouter ausweist. Behandle ihn wie ein Passwort.

1. Öffne **openrouter.ai/keys** (oder Profilbild, dann **„Keys“**).
2. Klicke auf **„Create Key“** (Schlüssel erstellen).
3. **Name:** zum Beispiel „Pult“.
4. **Credit limit (Ausgabengrenze):** Trage zum Beispiel **10** ein. Das ist die wichtigste Einstellung. Ist die Grenze erreicht, lehnt OpenRouter weitere Anfragen ab, und es wird nichts mehr abgebucht. OpenRouter empfiehlt selbst, bei jedem Schlüssel eine Grenze zu setzen.
5. Klicke auf **„Create“**.
6. Der Schlüssel erscheint **nur jetzt, ein einziges Mal**. Er beginnt mit `sk-or-`. Klicke auf das Kopier-Symbol.
7. Öffne Pult, füge ihn bei der Einrichtung ein (Strg + V, Mac: Cmd + V).

**Verloren gegangen?** Dann erstellst du einfach einen neuen Schlüssel und löschst den alten. Das kostet nichts.

*Bilder: `03-keys.png` (Seite „Keys“ mit „Create Key“), `04-key-erstellen.png` (Formular mit Name und Credit limit)*

## Schritt 4: In Pult eintragen

1. In der Einrichtung von Pult **„OpenRouter“** wählen.
2. Den Schlüssel einfügen.
3. Das vorausgewählte Modell (`deepseek/deepseek-v4.1-flash`) so lassen.
4. **„Verbindung testen“** klicken. Es muss grün werden. Dann speichern.

Wie es weitergeht, steht in `docs/anleitung-tester.md`.

---

## Wie viel habe ich verbraucht?

- **In Pult:** Oben im Gespräch zeigt der Ring Verbrauch, geschätzte Kosten und, wenn der Anbieter es liefert, das Guthaben.
- **Bei OpenRouter:** Unter **„Activity“** (Aktivität) siehst du jede Anfrage mit Kosten, unter **„Credits“** dein Restguthaben, unter **„Keys“** den Verbrauch je Schlüssel.

*Bild: `05-activity.png`*

## FAQ

**Muss ich ein Abo abschließen?**
Nein. Du lädst Guthaben auf und verbrauchst es.

**Was passiert, wenn das Guthaben oder die Grenze erreicht ist?**
Pult meldet einen Fehler, zum Beispiel „Insufficient credits“. Lade Guthaben nach oder erhöhe die Grenze auf der Seite „Keys“. Es geht nichts kaputt.

**Mein Schlüssel ist aus Versehen irgendwo gelandet (E-Mail, Foto, Chat).**
Gehe auf **„Keys“**, lösche ihn und erstelle einen neuen. Der alte funktioniert dann nicht mehr.

**Kann ich mehrere Personen mit einem Schlüssel arbeiten lassen?**
Nein, lieber nicht. Jede Lehrkraft nimmt ihren eigenen Schlüssel mit eigener Grenze. Dann siehst du den Verbrauch getrennt und kannst einen Schlüssel einzeln sperren.

**Die Bezahlung klappt nicht.**
Probiere eine andere Zahlungsart. Manche Karten sind für Zahlungen ins Ausland gesperrt. Bei Fragen hilft der Support von OpenRouter (Link im Seitenfuß).

**Darf ich das mit Schülerdaten benutzen?**
Nein. Keine Schülernamen, keine Noten, keine Fotos von Klassenarbeiten. Deine Eingaben gehen an OpenRouter und das gewählte Modell. Siehe Datenschutz in `docs/anleitung-tester.md`.

**Kann ich später ein anderes Modell nehmen?**
Ja, mit demselben Schlüssel. Wähle in den Einstellungen von Pult ein anderes Modell aus der empfohlenen Liste. Gemessen ist bisher vor allem DeepSeek V4.1 flash (`docs/schluessel-empfehlung.md`).
