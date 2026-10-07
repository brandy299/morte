import { useEffect, useState } from "react";
import { entferneVorlage, getVorlagen, type VorlageInfo } from "./api.ts";

/** First sentence of a description, which is what a teacher needs to recognize a template. */
const short = (text: string) => {
  const first = /^(.+?[.!?])(\s|$)/.exec(text)?.[1] ?? text;
  return first.length > 170 ? `${first.slice(0, 167)}…` : first;
};

export function Vorlagen({ onClose, onBuild }: { onClose: () => void; onBuild: () => void }) {
  const [list, setList] = useState<VorlageInfo[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const reload = () => getVorlagen().then(setList).catch(() => setProblem("Die Vorlagen konnten nicht geladen werden."));
  useEffect(() => {
    void reload();
  }, []);

  const remove = async (v: VorlageInfo) => {
    if (!window.confirm(`Soll deine Vorlage „${v.titel}“ gelöscht werden?`)) return;
    const res = await entferneVorlage(v.name);
    if (!res.ok) setProblem((await res.json().catch(() => ({}))).error ?? "Das Löschen hat nicht geklappt.");
    void reload();
  };

  const own = list?.filter((v) => v.eigene) ?? [];
  const bundled = list?.filter((v) => !v.eigene) ?? [];
  return (
    <main className="setup lehrplan">
      <div className="setup-card wide">
        <button type="button" className="link back" onClick={onClose}>
          ← Zurück zum Gespräch
        </button>
        <h1>Vorlagen</h1>
        <p className="lead">
          Eine Vorlage legt fest, wie ich ein bestimmtes Material für dich baue. Ich nehme die passende Vorlage von selbst, wenn du etwas wünschst. Du kannst eigene Vorlagen bauen, zum Beispiel „Vokabeltests wie in unserer Fachschaft“.
        </p>
        {problem && <p className="error">{problem}</p>}
        <div className="setup-actions">
          <button type="button" className="primary" onClick={onBuild}>
            Neue Vorlage bauen
          </button>
        </div>

        <h2 className="group">Deine Vorlagen</h2>
        {list && own.length === 0 && <p className="empty">Noch keine eigene Vorlage. Ich führe dich in ein paar Fragen durch, und du kannst sie gleich ausprobieren.</p>}
        <ul className="plans">
          {own.map((v) => (
            <li key={v.name}>
              <div className="plan-main">
                <strong>{v.titel}</strong>
                <span className="muted">{short(v.beschreibung)}</span>
              </div>
              <div className="plan-actions">
                <button type="button" className="ghost small" onClick={() => void remove(v)}>
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="group">Mitgeliefert</h2>
        <ul className="plans">
          {bundled.map((v) => (
            <li key={v.name}>
              <div className="plan-main">
                <strong>{v.titel}</strong>
                <span className="muted">{short(v.beschreibung)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
