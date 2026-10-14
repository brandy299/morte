# Sicherheit

Pult läuft auf dem Computer der Lehrkraft und speichert dort Klassen, Material und Gespräche. Der Zugangsschlüssel zum KI-Anbieter liegt im Schlüsselbund des Betriebssystems oder in einer Datei nur für den Nutzer.

## Eine Lücke melden

Bitte melde Sicherheitslücken **nicht öffentlich** in einem Issue. Nutze im Reiter **Security** dieses Repos die Funktion **„Report a vulnerability“** (private Meldung). Beschreibe, was du gefunden hast und wie man es nachstellt, und gib keine echten Schlüssel oder Schülerdaten an.

## Was wir wissen und bewusst so machen

- Wer Zugriff auf deinen Computer und dein Benutzerkonto hat, kommt auch an die Daten und den Schlüssel in `pult-daten`. Pult verschlüsselt den Datenordner nicht.
- Pult ist für **eine Person auf einem Computer** gedacht, ohne Anmeldung. Der lokale Server hört nur auf `127.0.0.1` (diesem Computer) und weist Anfragen mit fremdem Host-Namen oder fremder Herkunft ab (siehe `src/server`).
- Die Dateien einer interaktiven Übung enthalten die Lösungen. Sie sind für das Üben da, nicht für Klassenarbeiten.
