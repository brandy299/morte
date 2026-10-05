import { useEffect, useRef, useState } from "react";
import { getUsage, type UsageInfo, type UsageSnapshot } from "./api.ts";

const num = (n: number) => Math.round(n).toLocaleString("de-DE");
const money = (usd: number) => (usd === 0 ? "keine Angabe" : usd > 0 && usd < 0.01 ? "unter 0,01 US-$" : `ca. ${usd.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} US-$`);

/** A small ring next to the input field. Click it for the details. Hidden away like in the Claude app. */
export function UsageMeter({ usage }: { usage?: UsageSnapshot }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<UsageInfo | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // Refresh month total and balance each time the details open or an answer arrives.
  useEffect(() => {
    if (open) void getUsage().then(setInfo).catch(() => {});
  }, [open, usage?.cost]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!usage) return null;
  const fill = usage.contextWindow > 0 ? Math.min(1, usage.contextTokens / usage.contextWindow) : 0;
  const percent = Math.round(fill * 100);
  const warn = fill >= 0.8;
  const r = 7;
  const c = 2 * Math.PI * r;

  return (
    <div className="meter" ref={box}>
      <button type="button" className={warn ? "ring warn" : "ring"} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Verbrauch und Gedächtnis, ${percent} Prozent voll`}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
          <circle cx="10" cy="10" r={r} className="ring-bg" />
          <circle cx="10" cy="10" r={r} className="ring-fg" strokeDasharray={`${c * fill} ${c}`} transform="rotate(-90 10 10)" />
        </svg>
      </button>
      {open && (
        <div className="pop" role="dialog" aria-label="Verbrauch">
          <p className="pop-title">Gedächtnis dieses Gesprächs</p>
          <div className="bar"><span style={{ width: `${percent}%` }} className={warn ? "warn" : ""} /></div>
          <p className="pop-line">{percent} % voll</p>
          {warn && <p className="pop-warn">Das Gespräch wird lang. Starte am besten ein neues, sonst vergesse ich Dinge vom Anfang.</p>}
          <dl>
            <dt>In diesem Gespräch</dt>
            <dd>{num(usage.inputTokens)} gelesen, {num(usage.outputTokens)} geschrieben<br /><span className="muted">Kosten {usage.cost === 0 && usage.inputTokens > 0 ? "keine Angabe" : money(usage.cost)}</span></dd>
            {info && (
              <>
                <dt>Dieser Monat</dt>
                <dd>{money(info.month.cost)}</dd>
                {info.balance && (<><dt>Guthaben</dt><dd>{info.balance.text}</dd></>)}
              </>
            )}
          </dl>
          <p className="pop-note">Die Kosten sind geschätzt. Die genaue Rechnung findest du bei deinem KI-Anbieter. Gelesen und geschrieben wird in „Tokens“ gezählt, das sind Textstücke.</p>
        </div>
      )}
    </div>
  );
}
