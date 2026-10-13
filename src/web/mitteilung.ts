/**
 * Messages for the teacher when Pult is done, has a question or got stuck while she works in another window.
 * Two parts: the tab title always changes (no permission needed), a desktop notice only when she switched it on and the browser allows it.
 */
export type Anlass = "fertig" | "frage" | "fehler";

const KEY = "pult.mitteilungen";

/** Text of the desktop notice. Titles of finished material come first, at most three. */
export function mitteilungsText(anlass: Anlass, titel: string[] = []): { titel: string; text: string } {
  if (anlass === "frage") return { titel: "Pult hat eine Rückfrage", text: "Ich brauche eine Antwort von dir, bevor ich weitermache." };
  if (anlass === "fehler") return { titel: "Pult ist hängen geblieben", text: "Schau bitte kurz nach, was passiert ist." };
  const shown = titel.slice(0, 3).join(", ");
  const more = titel.length > 3 ? ` und ${titel.length - 3} weitere` : "";
  return { titel: "Pult ist fertig", text: titel.length ? `${shown}${more} liegt bereit.` : "Deine Antwort liegt bereit." };
}

/** What the tab title says while she is away. */
export const tabTitel = (anlass: Anlass) => (anlass === "frage" ? "❓ Rückfrage · Pult" : anlass === "fehler" ? "⚠ Hängt · Pult" : "✓ Fertig · Pult");

export const unterstuetzt = () => typeof Notification !== "undefined";

export function anGeschaltet(): boolean {
  try {
    return localStorage.getItem(KEY) === "an" && unterstuetzt() && Notification.permission === "granted";
  } catch {
    return false;
  }
}

/** Switches the desktop notice on. Asks the browser for permission, which needs a click. Returns a plain-language problem or undefined. */
export async function anschalten(): Promise<string | undefined> {
  if (!unterstuetzt()) return "Dieser Browser kann keine Mitteilungen zeigen.";
  const erlaubnis = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (erlaubnis !== "granted") return "Der Browser hat Mitteilungen blockiert. Erlaube sie für diese Seite (Schloss-Symbol in der Adressleiste) und versuche es noch einmal.";
  try {
    localStorage.setItem(KEY, "an");
  } catch {
    return "Das konnte nicht gespeichert werden.";
  }
  return undefined;
}

export function ausschalten() {
  try {
    localStorage.setItem(KEY, "aus");
  } catch {
    // Without storage the switch stays as it was; nothing else to do.
  }
}

const away = () => document.hidden || !document.hasFocus();
let ursprung: string | undefined;

/** Tells her, if she is not looking at Pult. The title goes back when she returns. */
export function melde(anlass: Anlass, titel: string[] = []) {
  if (!away()) return;
  ursprung ??= document.title;
  document.title = tabTitel(anlass);
  const restore = () => {
    if (away()) return;
    if (ursprung !== undefined) document.title = ursprung;
    ursprung = undefined;
    window.removeEventListener("focus", restore);
    document.removeEventListener("visibilitychange", restore);
  };
  window.addEventListener("focus", restore);
  document.addEventListener("visibilitychange", restore);
  if (anGeschaltet()) {
    const t = mitteilungsText(anlass, titel);
    const n = new Notification(t.titel, { body: t.text, tag: "pult" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }
}
