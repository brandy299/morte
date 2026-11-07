import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo.tsx";

interface Fortschritt {
  schritt: "laden" | "pruefen" | "einrichten" | "installieren";
  anteil?: number;
}

const SCHRITTE = {
  normal: ["Neue Version laden", "Prüfen und einrichten", "Pult neu starten"],
  installieren: ["Neue Version laden", "Prüfen", "Installieren und neu öffnen"],
};

/** Index of the step that is running now. */
export const schrittNummer = (f: Fortschritt | null, fertig: boolean) => (fertig ? 2 : f?.schritt === "pruefen" || f?.schritt === "einrichten" ? 1 : 0);

/** How full the bar is (0 to 100): downloading takes the first 70 percent, checking up to 90, the restart the rest. */
export function balkenProzent(f: Fortschritt | null, fertig: boolean): number {
  if (fertig) return 95;
  if (!f) return 3;
  if (f.schritt === "laden") return 3 + Math.round((f.anteil ?? 0) * 67);
  return 85;
}

/**
 * Full-screen display while Pult updates: steps, a bar that fills while the new version downloads, and a calm motion
 * while it restarts. It starts the update itself, follows its progress and loads the new page when the server is back.
 * `onFehler` gets the problem in plain German when something goes wrong; the display is gone then.
 */
export function UpdateLauf({ neuInstallieren, onFehler }: { neuInstallieren?: boolean; onFehler: (text: string) => void }) {
  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(null);
  const [fertig, setFertig] = useState(false);
  const gestartet = useRef(false);

  useEffect(() => {
    if (gestartet.current) return;
    gestartet.current = true;
    let aktiv = true;
    const frage = window.setInterval(() => {
      fetch("/api/update/fortschritt")
        .then((r) => r.json())
        .then((f) => aktiv && f && setFortschritt(f), () => {});
    }, 400);
    (async () => {
      const res = await fetch("/api/update/start", { method: "POST" }).catch(() => undefined);
      window.clearInterval(frage);
      if (!res?.ok) return onFehler((await res?.json().catch(() => undefined))?.error ?? "Das Aktualisieren hat nicht geklappt. Versuche es später noch einmal.");
      setFertig(true);
      // The whole program is replaced: the window closes by itself and opens again after the installation.
      if (neuInstallieren) return;
      await new Promise((r) => setTimeout(r, 1500));
      for (let i = 0; i < 120; i++) {
        if (await fetch("/api/setup/status").then((r) => r.ok, () => false)) return location.reload();
        await new Promise((r) => setTimeout(r, 500));
      }
      onFehler("Pult hat sich nicht wieder gemeldet. Schließe Pult und öffne es noch einmal.");
    })();
    return () => {
      aktiv = false;
      window.clearInterval(frage);
    };
  }, [neuInstallieren, onFehler]);

  const schritte = neuInstallieren ? SCHRITTE.installieren : SCHRITTE.normal;
  const jetzt = schrittNummer(fortschritt, fertig);
  const prozent = balkenProzent(fortschritt, fertig);
  return (
    <div className="update-lauf" role="alertdialog" aria-modal="true" aria-labelledby="update-titel" aria-describedby="update-text">
      <div className="update-karte">
        <Logo />
        <h2 id="update-titel">Pult wird aktualisiert</h2>
        <p id="update-text" className="muted">
          {neuInstallieren ? "Pult schließt sich gleich und öffnet sich nach dem Installieren von allein wieder." : "Das dauert einen Moment, dann geht es hier von allein weiter."} Bitte schließe das Fenster nicht. Deine Gespräche, Klassen und Schlüssel bleiben erhalten.
        </p>
        <div className="update-balken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={prozent} aria-label="Fortschritt der Aktualisierung">
          <div className={fertig ? "fuell wartet" : "fuell"} style={{ width: `${prozent}%` }} />
        </div>
        <ol className="update-schritte">
          {schritte.map((t, i) => (
            <li key={t} className={i < jetzt ? "fertig" : i === jetzt ? "jetzt" : ""} aria-current={i === jetzt ? "step" : undefined}>
              <span className="punkt" aria-hidden>{i < jetzt ? "✓" : ""}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * Looks up whether there is a new version of the desktop app: at the start and then every half hour.
 * "Later" hides the note until Pult is opened the next time.
 */
export function useNeueVersion(): { verfuegbar: boolean; neuInstallieren: boolean; spaeter: () => void } {
  const [info, setInfo] = useState<{ verfuegbar: boolean; neuInstallieren: boolean }>({ verfuegbar: false, neuInstallieren: false });
  const [versteckt, setVersteckt] = useState(() => {
    try {
      return sessionStorage.getItem("pult-update-spaeter") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!window.pultApp) return;
    const sieh = () =>
      fetch("/api/update")
        .then((r) => r.json())
        .then((u) => setInfo({ verfuegbar: Boolean(u.verfuegbar), neuInstallieren: Boolean(u.neuInstallieren) }), () => {});
    void sieh();
    const t = window.setInterval(sieh, 30 * 60 * 1000);
    return () => window.clearInterval(t);
  }, []);
  return {
    ...info,
    verfuegbar: info.verfuegbar && !versteckt,
    spaeter: () => {
      setVersteckt(true);
      try {
        sessionStorage.setItem("pult-update-spaeter", "1");
      } catch {
        // Without storage the note is just hidden until the page reloads.
      }
    },
  };
}
