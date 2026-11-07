/**
 * Second look at freshly made material ("Material prüfen"). After the answer is done, the same model
 * reads its own work once more against a short list and fixes real mistakes. Switched on and off by the teacher.
 */
export const PRUEF_LABEL = "Prüfe das Material noch einmal";

export function pruefAnfrage(titel: string[]): string {
  return `[Automatische Prüfung, keine Nachricht der Lehrkraft] Sieh dir das eben erstellte Material noch einmal kritisch an: ${titel.map((t) => `„${t}“`).join(", ")}.
Prüfe nur diese Punkte:
1. Fachlich richtig? Lösungen, Rechnungen, Jahreszahlen, Begriffe.
2. Passt es zur Anfrage der Lehrkraft (Klasse, Stufe, Thema, Umfang)? Fehlt etwas Verlangtes?
3. Sauber gebaut? Aufgaben und Lösungen gehören zusammen, keine leeren oder doppelten Stellen, kein Schülername.
Findest du einen echten Fehler, erstelle das Material mit dem passenden Werkzeug korrigiert noch einmal und erwähne es nicht als Neuigkeit, sondern als Korrektur. Verbessere nichts, nur weil es anders ginge. Antworte danach mit genau einem kurzen Satz auf Deutsch, der mit „Geprüft:“ beginnt (zum Beispiel „Geprüft: alles stimmig.“ oder „Geprüft: eine Lösung korrigiert.“). Bleibt etwas unsicher, nenne es in diesem Satz.`;
}
