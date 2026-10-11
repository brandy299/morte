# 018: Interaktive Übung als Datei für den Browser, vom Programm gebaut

Stand: 2026-10-11

## Entscheidung

1. **Das Modell schreibt Daten, kein Programm.** Eine Übung besteht aus Schritten der Arten `info`, `auswahl`, `lueckentext`, `zuordnung`, `offen` und `checkliste`. Pult prüft sie an der Grenze (`src/core/uebung/schema.ts`, Meldungen in einfacher Sprache mit Schrittnummer) und baut die Seite selbst (`html.ts`, `assets/uebung/uebung.js`). So geht es mit jedem zugelassenen Modell, und die Seite verhält sich immer gleich.
2. **Eine einzige HTML-Datei, ohne Internet.** Schrift (Fraunces) und Skript stecken in der Datei. Keine Bibliothek, keine Schrift, kein Bild aus dem Netz. Das unterscheidet die Übung von dem, was Modelle sonst gern bauen (Tailwind, Icon-Bibliotheken und Konfetti über CDN): Das braucht Internet auf dem Schul-PC und lädt bei jedem Öffnen von Dritten (Datenschutz).
3. **Nichts wird gespeichert und nichts gesendet.** Keine Namen, kein Speicher im Browser (kein `localStorage`, keine Cookies), keine Anfrage. Die Ergebnisse bleiben in der Seite und sind weg, wenn sie geschlossen wird. Die Datei trägt keinen Namen einer Schülerin oder eines Schülers.
4. **Die Lösungen stecken in der Datei.** Wer den Quelltext liest, findet sie. Für eine Übung ist das in Ordnung, für eine Klassenarbeit nicht. Die Anleitung sagt das ehrlich.
5. **Vorschau im Schutzraum.** Wie beim Erklärstück (017): Rahmen mit `sandbox="allow-scripts"` und Schutzregel des Servers, die Seite kommt nicht an Pult-Daten und lädt nichts. Der Server liefert nur HTML aus, das Pult selbst abgelegt hat.
6. **Bedienung:** Ein Schritt nach dem anderen, Fortschrittsanzeige, jede Aufgabe wird einmal geprüft (Rückmeldung mit Haken oder Kreuz und Text, nicht nur Farbe, dazu eine kurze Erklärung), am Ende der Punktestand mit Sprung zurück zu einzelnen Schritten und „Noch einmal von vorn“. Echte Formularfelder (Auswahl, Auswahlliste, Textfeld), per Tastatur und am Handy bedienbar, Rückmeldung wird vorgelesen (`aria-live`), Kontrast mindestens 7:1 (Test). Zuordnen mit Auswahllisten statt Ziehen mit der Maus: Das geht ohne Maus und am Handy.
7. **Aufbau, den die Anleitung verlangt:** Einstieg, Erarbeitung, Prüfen, Anwenden (offene Aufgabe und Selbsteinschätzung). Die Gliederung stammt aus einer Anleitung für Lernpfade, die wir ohne ihre Netz-Bibliotheken übernommen haben.

## Nicht gewählt

- Freier HTML-, CSS- und JavaScript-Code vom Modell: wäre vom Modell abhängig, nicht prüfbar und ein Sicherheitsrisiko.
- Konfetti und Icon-Bibliotheken: brauchen das Netz, eine eigene Animation brauchen wir nicht.
- Ergebnisse sammeln: siehe unten.

## Später

- **Ergebnisse an einer Stelle sammeln und Moodle bespielen.** Die Schule testet Moodle noch. Wenn es so weit ist, wird daraus ein eigener Weg (zum Beispiel ein Paket, das Moodle aufnimmt, oder ein Ergebnisbogen ohne Namen). Der Aufbau aus Daten macht das leichter, weil derselbe Inhalt in ein anderes Format gebracht werden kann.
- Weitere Aufgabenarten (Reihenfolge, Bild beschriften) nur, wenn sie gebraucht werden.
