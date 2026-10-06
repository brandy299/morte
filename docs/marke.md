# Marke: Logo und Farben von Pult

## Die Idee

Das kleine **p** ist ein Pult von der Seite: Der Bauch ist die schräge Pultplatte (15 Grad), der Strich ist das Bein. Die gleiche Schräge steckt in jedem oberen Abschluss des Schriftzugs.

## Teile

| Datei (in `design/logo/`) | Wofür |
|---|---|
| `pult-logo.svg` | Das Logo: Schriftzug, das p in Rostrot. Standard überall, wo Platz ist |
| `pult-logo-einfarbig.svg` | Ganz dunkel, für Druck in Schwarz-Weiß und Stempel |
| `pult-logo-hell.svg` | Für dunklen Grund |
| `pult-zeichen.svg` | Nur das p, wo es eng ist (Avatar, Ecke einer Folie) |
| `pult-zeichen-klein.svg` | Kräftigere Fassung für 16 bis 32 Pixel (Favicon, PDF-Fuß) |
| `pult-zeichen-hell.svg` | Das p hell auf dunklem Grund, etwas dünner gezeichnet |
| `export/` | Favicon, App-Icon, Web-Icons, schwarze und weiße Fassungen |

Zeichen und Schriftzug stehen **nie nebeneinander**: Das läse sich "Ppult". Das p im Schriftzug ist schon das Zeichen.

Alle SVG-Dateien entstehen aus `design/logo/build.py` (`python3 design/logo/build.py`). Die PNG-Icons in `export/` wurden aus den SVGs gerendert.

## Farben

| Name | Wert | Einsatz |
|---|---|---|
| Rostrot | `#b4532a` | das p, Akzente, App-Icon |
| Tinte | `#23201b` | Schrift |
| Papier | `#f4efe6` | Grund der App, helles p auf Rostrot |

Kontraste: Rostrot auf Papier 4,35 : 1, Rostrot auf Weiß 4,99 : 1, Rostrot auf Tinte 3,25 : 1, Tinte auf Papier 14,17 : 1. Für ein Logo reichen 3 : 1.

## Regeln

- **Schutzraum:** rundherum mindestens die Breite des Strichs im p frei lassen.
- **Mindestgröße:** Logo 18 Pixel hoch (am Bildschirm) oder 6 mm (Druck). Darunter nur das Zeichen, unter 32 Pixeln die kleine Fassung.
- **Material in Graustufen:** Im PDF-Fuß steht das kleine Zeichen in Grau. Das Logo braucht keine Farbe, um zu funktionieren.
- **Nicht:** verzerren, drehen, spiegeln (gespiegelt wird es ein q), Schatten oder Verläufe hinzufügen, andere Farben als die drei oben, das p durch einen anderen Buchstaben ersetzen, den Schriftzug mit einer gewöhnlichen Schrift nachsetzen.

## Herkunft

Entworfen am 2026-10-06 mit dem Logo-Skill `kaankiziltug/logo-design-skill` (MIT) als Werkzeug. Aus dem Skill ist nichts ins Repo gekommen, auch keine Logos aus seiner Vergleichssammlung. Logo und Zeichnungsquelle sind eigene Arbeit unter der Lizenz des Repos. Eine Markenrecherche steht noch aus (siehe Entscheidung 004).
