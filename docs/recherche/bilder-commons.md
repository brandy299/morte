# Recherche: Bilder und Quellen für den Unterricht (Wikimedia Commons)

Stand: 2026-10-08 · Verfasser: Recherche-Agent · Auslöser: Geschichte (Drittes Reich, Geschichte der BRD) braucht Fotos, Plakate und Karten. Yannik: Pult darf und soll auch Symbole wie das Hakenkreuz für den Unterricht erzeugen, "es ist wichtig, sich damit didaktisch auseinanderzusetzen". Bilder kommen mit Creative-Commons-Lizenz von Wikipedia und Co.

## Entscheidung von Yannik

- Symbole verfassungsfeindlicher Organisationen dürfen in Unterrichtsmaterial vorkommen. Pult sperrt sie nicht. Rechtlich erlaubt § 86a Absatz 3 in Verbindung mit § 86 Absatz 3 StGB die Verwendung zur staatsbürgerlichen Aufklärung und für Lehre und Unterricht. Kein Rechtsrat. Die Verantwortung liegt bei der Lehrkraft.
- Bilder werden nicht erzeugt, sondern von Wikimedia Commons geholt, mit Lizenzangabe.

## Probe: Commons-Schnittstelle (2026-10-08)

Eine Suche nach "Machtergreifung 1933 Bundesarchiv" in Commons (`action=query`, Suche im Namensraum Datei, `prop=imageinfo`, `iiprop=url|extmetadata`) lieferte fünf Treffer. Für jeden gibt die Schnittstelle **maschinenlesbar** zurück:

| Datei | Lizenz (`LicenseShortName`) | Namensnennung (`AttributionRequired`) |
|---|---|---|
| Bundesarchiv Bild 102-02982A, Fackelzug … | CC BY-SA 3.0 de | ja |
| Bundesarchiv Bild 102-15347, Ernennung Hitlers … | CC BY-SA 3.0 de | ja |
| Bundesarchiv Bild 146-1972-026-11, Machtübernahme … | Public domain | nein |

Außerdem gibt es das Feld `Restrictions` (Persönlichkeitsrechte, Marken, Denkmalschutz u. a.), Urheber (`Artist`) und Angabe der Herkunft (`Credit`), und eine Vorschau-URL in wählbarer Breite (`iiurlwidth`).

**Belegt:** Lizenz, Pflicht zur Nennung und Urheber lassen sich per Programm lesen, ohne Anmeldung. Das ist die Grundlage für eine automatische Quellenzeile unter dem Bild.

**Beobachtet:** Der erste Aufruf wurde mit **HTTP 429** (zu viele Anfragen, `retry-after: 31`) abgelehnt. Diese Umgebung teilt sich eine Ausgangsadresse mit anderen, bei Lehrkräften zu Hause wäre es seltener, aber Pult muss mit 429 umgehen (warten, wenig fragen, Treffer zwischenspeichern). Wikimedia verlangt einen **aussagekräftigen User-Agent** mit Kontaktangabe. Nicht gelesen habe ich die aktuelle Fassung der Nutzungsregeln. Das muss die Umsetzung vor dem Bau tun.

## Was zu klären bleibt (Rechtliches, nicht von mir zu entscheiden)

1. **CC BY-SA verlangt Weitergabe unter gleichen Bedingungen** für Bearbeitungen. Ob ein Arbeitsblatt mit eingefügtem Foto eine Bearbeitung ist oder eine Sammlung, ist rechtlich nicht sicher. Mindestens nötig ist die Namensnennung mit Lizenz unter dem Bild. Empfehlung: erlaubte Lizenzen sind Gemeinfrei, CC0, CC BY und CC BY-SA, jeweils mit Quellenzeile. Das ist eine Voreinstellung und in einer Entscheidungsdatei festzuhalten. Yannik kann sie ändern.
2. **Persönlichkeitsrechte** bei Fotos lebender Personen (`Restrictions`). Für das Dritte Reich meist unkritisch, für die BRD-Geschichte ab den 1970ern nicht immer. Pult zeigt den Hinweis, wenn die Schnittstelle einen liefert.
3. **Dateien, die nur auf Commons als "frei" gelten, aber nicht in allen Ländern.** Gilt nicht für die meisten Bundesarchiv-Bilder, aber die Lehrkraft muss das wissen. Im Kleingedruckten der Oberfläche in einfacher Sprache.

## Wie es in Pult aussehen sollte

- **Zwei feste Werkzeuge** für den Agenten, kein freier Netzzugang: Bilder suchen (liefert Titel, Vorschau, Lizenz, Urheber, Größe) und Bild einfügen (lädt die Datei, prüft sie, setzt sie mit Quellenzeile ins Material). Der Agent sieht die Vorschaubilder selbst (alle zugelassenen Modelle können Bilder) und wählt aus.
- **Nur eine Adresse:** `commons.wikimedia.org` und `upload.wikimedia.org`. Alles andere wird abgelehnt.
- **Quellenzeile aus den Daten der Schnittstelle**, nicht vom Modell geschrieben (sonst könnte es sie erfinden): Titel, Urheber, Lizenz, Link.
- **Graustufen** für den Druck, wie im Rest der Materialien. Historische Fotos sind meist ohnehin grau.
- **Datenschutz:** Nur der Suchtext verlässt den Rechner, keine Schülerdaten. Der Agent bekommt das schon als Regel.
- **Offline:** Ohne Internet eine verständliche Meldung in einfacher Sprache, das Material wird ohne Bild fertig und sagt, was fehlt.
- **Prüfung am Rand:** Dateityp, Größe, Neu-Kodieren, wie bei #17 für das Logo.

## Was die Probe nicht belegt

- Bild einfügen in PDF und Word. Im Code gibt es nur Schaubilder (als PNG in Word), **keine eingebetteten fremden Bilder** in `layout.ts`. Das ist der größere Teil der Arbeit.
- Qualität der Suche bei weiteren Themen (Plakate, Karten, Karikaturen). Ein Treffer ist nicht automatisch brauchbar. Gemessen wird das mit den Geschichtsthemen.
- Wie viele Anfragen ein Arbeitsblatt braucht, und ob das Limit stört.
- Karten: Commons hat viele, aber oft mit englischer Beschriftung.
- Ob **Wikipedia-Artikeltext** (CC BY-SA) als Quelle erlaubt sein soll. Nicht untersucht, nicht Teil dieses Issues.
- **Fachliche Güte der Auswahl** (passt das Foto zum Thema, wirkt es angemessen?) kann nur die Lehrkraft beurteilen. Gegenlese am Samstag oder durch den Geschichtskollegen.

## Zusammenhang mit "Nichts erfinden"

Für Geschichte gilt zusätzlich: Zitate nur mit Quellenangabe, sonst als sinngemäß kennzeichnen. Das ist eine Regel für die Anleitung des Geschichtsmaterials und kommt in ein eigenes Issue, sobald die Gegenlese die ersten Beispielblätter gesehen hat.
