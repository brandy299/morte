# 005: Stundenplan per iCal

Stand: 2026-10-05

## Entscheidung

- Der Stundenplan kommt als iCal-Datei (`.ics`) in die App, entweder als Datei oder als https-Link. UNTIS und viele Schulportale bieten diesen Export an. Der Link steht im Schlüsselbund (Secrets), nicht im Klartext im Datenordner.
- Gelesen wird mit `ical.js` (MPL-2.0). Die Bibliothek wird unverändert als Abhängigkeit genutzt, es wird kein Code kopiert. Die Lizenz verlangt dafür nur, ihren Hinweis beizulegen (siehe `README.md`).
- Zeiten werden in deutsche Ortszeit umgerechnet. Wiederholungen und Ausnahmen werden aufgelöst, ganztägige Einträge übersprungen.
- Eine Stunde gehört zu Klasse und Fach über `Stundenplan/Zuordnung.json`. Der Schlüssel ist der Titel der Stunde. Die App macht Vorschläge, die Lehrkraft bestätigt.
- Die Wochenansicht ordnet Stunden über das Datum den Zeilen in der Stundentabelle der Reihe zu.
- Eine auf eine Stunde gezogene Datei landet im `Material/`-Ordner der passenden Reihe und wird in der Tabellenzeile vermerkt. Erlaubt sind nur die bekannten Material-Endungen.
- Alles bleibt in der App: keine Zusatzprogramme, keine Anmeldung bei UNTIS.

## Offen

Getestet wurde mit einer eigenen Beispieldatei, noch nicht mit einem echten UNTIS-Export.
