import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { answerConfirm, deleteHistory, getHistory, getVorlagen, type VorlageInfo, getRueckmeldungen, sendeRueckmeldung, type Rueckmeldung, getPlanStatus, getStatus, getTree, openHistory, getUsage, materialUrl, zipUrl, resetChat, retryMessage, type Frage, type Gegeben, sendMessage, type ChatEvent, type ConversationInfo, type StoredMessage, type KlasseInfo, type Material, type SetupStatus, type UsageSnapshot } from "./api.ts";
import { FILE_ACCEPT, MAX_FILES, MAX_IMAGES, readAttachment, type Attachment } from "./attachments.ts";
import { Gespraechsliste } from "./Gespraechsliste.tsx";
import { nurFuerLehrkraft } from "./vorschau.ts";
import { melde } from "./mitteilung.ts";
import { ModelInfo } from "./ModelInfo.tsx";
import { UsageMeter } from "./UsageMeter.tsx";
import { Lehrplan } from "./Lehrplan.tsx";
import { Vorlagen } from "./Vorlagen.tsx";
import { Start } from "./Start.tsx";
import { Stundenplan } from "./Stundenplan.tsx";
import { NewClass } from "./NewClass.tsx";
import { Onboarding } from "./Onboarding.tsx";
import { filterVorlagen, kurz, slashQuery, startText as slashStart } from "./slashMenu.ts";
import { classColors, classVar } from "./klassenfarbe.ts";
import { Fragen, FragenRueckblick } from "./Fragen.tsx";
import { Logo } from "./Logo.tsx";
import { Einstellungen } from "./Einstellungen.tsx";
import { MaterialSeite } from "./MaterialSeite.tsx";
import { Setup } from "./Setup.tsx";

interface Step {
  id: string;
  label: string;
  state: "running" | "done" | "failed";
}
interface Message {
  role: "user" | "assistant";
  text: string;
  images?: string[];
  dateien?: string[];
  /** Pictures that were attached in an earlier session; only the number is known. */
  bilder?: number;
  steps: Step[];
  materials?: Material[];
  confirm?: { id: string; question: string };
  /** Questions waiting for the teacher. */
  offeneFragen?: { id: string; fragen: Frage[] };
  /** Questions that were answered. */
  fragen?: Gegeben[];
  error?: string;
  /** The failed answer can be tried again. */
  retryable?: boolean;
  /** Shown while the app repeats a failed try on its own. */
  retryNote?: string;
}

export function App() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  // First start: the welcome steps run until the teacher finishes them, also after the key was saved on the way.
  const [onboarding, setOnboarding] = useState<boolean | null>(null);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [lehrplanOpen, setLehrplanOpen] = useState(false);
  const [stundenplanOpen, setStundenplanOpen] = useState(false);
  const [vorlagenOpen, setVorlagenOpen] = useState(false);
  // Which screen the chat area starts with: the week when a timetable exists, otherwise the chat.
  const [startView, setStartView] = useState<"chat" | "start" | null>(null);
  const [planVersion, setPlanVersion] = useState(0);
  const [tree, setTree] = useState<KlasseInfo[]>([]);
  const refreshTree = () => getTree().then(setTree).catch(() => {});
  const [history, setHistory] = useState<ConversationInfo[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const refreshHistory = () =>
    getHistory()
      .then((h) => {
        setHistory(h.gespraeche);
        setCurrentId(h.aktuell);
      })
      .catch(() => {});
  // A new key rebuilds the chat, with the messages of the conversation that was opened (or none).
  const [chat, setChat] = useState<{ key: number; messages: Message[]; startText?: string }>({ key: 0, messages: [] });
  const show = (anzeige: StoredMessage[], startText?: string) => {
    setStartView("chat");
    setChat((c) => ({ key: c.key + 1, startText, messages: anzeige.map((m) => ({ ...m, materials: m.materials })) }));
  };
  const open = async (id: string) => {
    const result = await openHistory(id);
    if (result) show(result.anzeige);
    void refreshHistory();
  };
  const remove = async (c: ConversationInfo) => {
    if (!window.confirm(`Soll das Gespräch „${c.titel}“ gelöscht werden?`)) return;
    const res = await deleteHistory(c.id);
    if (!res.ok) {
      window.alert((await res.json().catch(() => ({}))).error ?? "Das Löschen hat nicht geklappt.");
      return;
    }
    if (c.id === currentId) show([]);
    void refreshHistory();
  };
  const refresh = () =>
    getStatus().then((next) => {
      setStatus(next);
      setOnboarding((o) => o ?? !next.configured);
    });
  useEffect(() => {
    void refresh();
    void refreshTree();
    void refreshHistory();
    getPlanStatus().then((p) => setStartView((v) => v ?? (p.vorhanden ? "start" : "chat"))).catch(() => setStartView((v) => v ?? "chat"));
  }, []);

  if (!status || !startView) return null;
  // First start: only the setup. Afterwards the chat stays mounted behind the other screens,
  // so an answer that is still being written and the conversation on screen are not lost.
  if (onboarding || !status.configured) {
    return (
      <Onboarding
        status={status}
        onConfigured={() => void refresh()}
        onFinish={(next) => {
          setOnboarding(false);
          void refreshHistory();
          show([]);
          if (next === "stundenplan") setStundenplanOpen(true);
          if (next === "klasse") setNewClassOpen(true);
        }}
      />
    );
  }
  const overlay = setupOpen || newClassOpen || lehrplanOpen || stundenplanOpen || vorlagenOpen;
  return (
    <>
      <div className="chat-layer" hidden={overlay}>
        <Chat
          key={chat.key}
          initialMessages={chat.messages}
          initialView={startView}
          planVersion={planVersion}
          onStundenplan={() => setStundenplanOpen(true)}
          tree={tree}
          refreshTree={refreshTree}
          history={history}
          currentId={currentId}
          refreshHistory={refreshHistory}
          onOpen={open}
          onDelete={remove}
          onNew={() => show([])}
          onNewClass={() => setNewClassOpen(true)}
          startText={chat.startText}
          onVorlagen={() => setVorlagenOpen(true)}
          onLehrplan={() => setLehrplanOpen(true)}
          onSettings={() => setSetupOpen(true)}
          status={status}
        />
      </div>
      {setupOpen && (
        <Einstellungen
          status={status}
          onClose={() => setSetupOpen(false)}
          onDone={() => {
            // Saving builds a new session on the server, so the conversation on screen starts again too.
            setSetupOpen(false);
            void refresh();
            show([]);
            void refreshHistory();
          }}
        />
      )}
      {stundenplanOpen && (
        <Stundenplan
          onClose={() => {
            setStundenplanOpen(false);
            setPlanVersion((v) => v + 1);
            void refreshTree();
          }}
        />
      )}
      {vorlagenOpen && (
        <Vorlagen
          onClose={() => setVorlagenOpen(false)}
          onBuild={async () => {
            // A fresh conversation, in which the assistant starts guiding right away.
            await resetChat();
            setVorlagenOpen(false);
            show([], "Ich möchte eine eigene Vorlage bauen.");
          }}
        />
      )}
      {lehrplanOpen && (
        <Lehrplan
          onClose={() => {
            setLehrplanOpen(false);
            void refreshTree();
          }}
        />
      )}
      {newClassOpen && (
        <NewClass
          onCancel={() => setNewClassOpen(false)}
          onDone={() => {
            setNewClassOpen(false);
            void refreshTree();
          }}
        />
      )}
    </>
  );
}

interface ChatProps {
  initialMessages: Message[];
  initialView: "chat" | "start";
  /** Changes when the timetable was edited, so the week reloads. */
  planVersion: number;
  onStundenplan: () => void;
  history: ConversationInfo[];
  currentId?: string;
  refreshHistory: () => void;
  onOpen: (id: string) => void;
  onDelete: (c: ConversationInfo) => void;
  onNew: () => void;
  tree: KlasseInfo[];
  refreshTree: () => void;
  onNewClass: () => void;
  onLehrplan: () => void;
  onVorlagen: () => void;
  /** Sent as the first message when the conversation opens, e.g. to start the template builder. */
  startText?: string;
  onSettings: () => void;
  status: SetupStatus;
}

/** Word and PowerPoint files are downloaded; the preview shows PDFs only. */
const isDownload = (m: Material) => /\.(docx?|pptx)$/i.test(m.path);
const isSlides = (m: Material) => /\.pptx$/i.test(m.path);
/** An explainer piece: runs in the preview, inside a sandbox. */
const isHtml = (m: Material) => /\.html$/i.test(m.path);
const VARIANTS: Record<string, string> = { "": "Blatt", "Lösung": "Lösung", "Word": "Word", "Lösung, Word": "Lösung als Word", "PowerPoint": "PowerPoint" };

/**
 * One card per finished piece of material: the sheet, its solution and the Word versions as buttons on one card.
 * If the same piece was made again (a change was asked for), only the newest files show.
 */
/**
 * "Passt" / "Passt nicht" under a finished piece of material. "Passt nicht" asks for one sentence. Saved with the conversation, on this computer.
 * No names of pupils: the hint says so.
 */
function RueckmeldungKnoepfe({ gespraech, pfad, bisher, onSaved }: { gespraech: string; pfad: string; bisher?: Rueckmeldung; onSaved: (all: Rueckmeldung[]) => void }) {
  const [wertung, setWertung] = useState<Rueckmeldung["wertung"] | undefined>(bisher?.wertung);
  const [satz, setSatz] = useState(bisher?.satz ?? "");
  const [meldung, setMeldung] = useState<{ text: string; fehler?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setWertung(bisher?.wertung);
    setSatz(bisher?.satz ?? "");
  }, [bisher?.wertung, bisher?.satz]);

  const speichern = async (w: Rueckmeldung["wertung"], text?: string) => {
    setBusy(true);
    const res = await sendeRueckmeldung(gespraech, { pfad, wertung: w, satz: text?.trim() || undefined });
    setBusy(false);
    if (res.ok) {
      onSaved(res.rueckmeldungen);
      setMeldung({ text: w === "passt" ? "Danke, gespeichert." : text?.trim() ? "Danke, ich habe es mir gemerkt." : "Gespeichert. Ein Satz dazu hilft mir." });
    } else setMeldung({ text: res.error, fehler: true });
  };
  const wahl = (w: Rueckmeldung["wertung"]) => {
    setWertung(w);
    setMeldung(null);
    if (w === "passt") void speichern(w);
    else void speichern(w, satz);
  };
  return (
    <div className="rueckmeldung" role="group" aria-label="Hat das Material gepasst?">
      <span className="rueck-frage">Hat es gepasst?</span>
      <button type="button" className="rueck-knopf" aria-pressed={wertung === "passt"} disabled={busy} onClick={() => wahl("passt")}>
        Passt
      </button>
      <button type="button" className="rueck-knopf" aria-pressed={wertung === "passt-nicht"} disabled={busy} onClick={() => wahl("passt-nicht")}>
        Passt nicht
      </button>
      {wertung === "passt-nicht" && (
        <form
          className="rueck-form"
          onSubmit={(e) => {
            e.preventDefault();
            void speichern("passt-nicht", satz);
          }}
        >
          <label htmlFor={`rueck-${pfad}`}>Was hat nicht gepasst? Ein Satz reicht. Bitte keine Namen von Lernenden.</label>
          <textarea id={`rueck-${pfad}`} value={satz} maxLength={300} rows={2} onChange={(e) => setSatz(e.target.value)} />
          <div className="rueck-zeile">
            <small>{satz.length} von 300 Zeichen</small>
            <button type="submit" className="file-action" disabled={busy}>
              Speichern
            </button>
          </div>
        </form>
      )}
      <p className={meldung?.fehler ? "rueck-meldung fehler" : "rueck-meldung"} role="status">
        {meldung?.text ?? ""}
      </p>
    </div>
  );
}

/** Copies the text of one message, e.g. to paste it into an e-mail. */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // The browser refused the clipboard. The text can still be marked with the mouse.
    }
  };
  return (
    <button type="button" className="copy-msg" onClick={() => void copy()} aria-live="polite">
      {done ? "Kopiert" : "Kopieren"}
    </button>
  );
}

function groupMaterials(materials: Material[]): { title: string; parts: { label: string; file: Material }[] }[] {
  const groups = new Map<string, Map<string, Material>>();
  for (const file of materials) {
    const m = /^(.*?)(?: \(([^()]*)\))?$/.exec(file.title)!;
    const [title, variant] = m[2] !== undefined && m[2] in VARIANTS ? [m[1]!, m[2]] : [file.title, ""];
    if (!groups.has(title)) groups.set(title, new Map());
    groups.get(title)!.set(isDownload(file) && variant === "" ? "Word" : variant, file);
  }
  const order = Object.keys(VARIANTS).map((k) => (k === "" ? "" : k));
  return [...groups].map(([title, variants]) => ({
    title,
    parts: [...variants].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([variant, file]) => ({ label: isHtml(file) ? (/_Uebung-/.test(file.name) ? "Übung" : "Erklärstück") : variant === "" && [...variants.values()].some(isSlides) ? "Folien" : (VARIANTS[variant] ?? variant), file })),
  }));
}

/** One-click changes under a finished result. What fits depends on the kind of material (read from the file name). */
function followUps(materials: Material[]): { label: string; text: string }[] {
  const names = materials.map((m) => m.name);
  const has = (word: string) => names.some((n) => n.includes(`_${word}-`));
  const hasWord = names.some((n) => /\.docx$/i.test(n));
  const list: { label: string; text: string }[] = [];
  if (has("Arbeitsblatt") || has("Klausur")) {
    list.push({ label: "Kürzer", text: "Mach es etwas kürzer." }, { label: "Leichter", text: "Mach es etwas leichter." }, { label: "Schwerer", text: "Mach es etwas schwerer." });
  }
  if (has("Arbeitsblatt")) list.push({ label: "In drei Niveaus", text: "Mach daraus drei Niveaus: Basis, Standard und Erweiterung." });
  if (has("Verlauf")) list.push({ label: "Passendes Arbeitsblatt", text: "Erstelle zu dieser Stunde ein passendes Arbeitsblatt." });
  if (has("Lernsituation")) list.push({ label: "Material für Stunde 1", text: "Erstelle Material für die erste Stunde." });
  if (has("Uebung")) list.push({ label: "Mehr Fragen", text: "Mach die Übung etwas länger, mit mehr Fragen." }, { label: "Leichter", text: "Mach die Übung etwas leichter." }, { label: "Schwerer", text: "Mach die Übung etwas schwerer." });
  if (has("Erklaerstueck")) list.push({ label: "Ruhiger", text: "Mach das Erklärstück ruhiger." }, { label: "Zügiger", text: "Mach das Erklärstück zügiger." });
  if (!hasWord && names.length > 0 && !has("Erklaerstueck") && !has("Uebung")) list.push({ label: "Als Word", text: "Gib mir das auch als Word-Datei zum Bearbeiten." });
  return list;
}

const SUGGESTIONS = ["Welche Klassen habe ich?", "Wo fehlt noch Material?"];
// Without a class the two questions above lead nowhere; offer what the first test tasks are.
const FIRST_SUGGESTIONS = ["Ein Arbeitsblatt zu einem Thema aus meinem Unterricht", "Eine Unterrichtsreihe planen", "Eine Klausur mit Erwartungshorizont"];

function Chat({ initialMessages, initialView, planVersion, onStundenplan, history, currentId, refreshHistory, onOpen, onDelete, onNew, tree, refreshTree, onNewClass, onLehrplan, onVorlagen, startText, onSettings, status }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  // "Passt" / "Passt nicht" of the conversation that is open, by material path.
  const [rueck, setRueck] = useState<Record<string, Rueckmeldung>>({});
  useEffect(() => {
    if (!currentId) return setRueck({});
    let alive = true;
    void getRueckmeldungen(currentId).then((list) => alive && setRueck(Object.fromEntries(list.map((r) => [r.pfad, r]))));
    return () => {
      alive = false;
    };
  }, [currentId]);
  const [view, setView] = useState<"chat" | "start" | "material">(initialView);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachProblem, setAttachProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  const [usage, setUsage] = useState<UsageSnapshot | undefined>();
  const [preview, setPreview] = useState<Material | null>(null);
  // A material step is running: the preview opens at once with a placeholder and is replaced by the file.
  const [building, setBuilding] = useState<{ id: string; label: string } | null>(null);
  const held = useRef<{ id: string; label: string } | null>(null);
  // Titles of the material made in the current request, and whether it went wrong, for the message when she is away.
  const madeTitles = useRef<string[]>([]);
  const sawError = useRef(false);
  // The preview shows the first piece of a request; a solution sheet that follows does not replace it.
  const previewSet = useRef(false);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    // Narrow windows: the menu slides in. Escape closes it, and focus goes to its close button.
    if (!navOpen) return;
    document.querySelector<HTMLElement>(".side-close")?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [navOpen]);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // The "/" menu: all templates with one line each, to pick from the keyboard or the mouse.
  const [vorlagen, setVorlagen] = useState<VorlageInfo[]>([]);
  const [slashAktiv, setSlashAktiv] = useState(0);
  const [slashZu, setSlashZu] = useState(false);
  const slash = slashQuery(input);
  const treffer = slash === undefined ? [] : filterVorlagen(vorlagen, slash);
  const slashOffen = slash !== undefined && !slashZu;
  useEffect(() => {
    if (slash === "") void getVorlagen().then(setVorlagen).catch(() => {});
  }, [slash === ""]);
  const waehle = (v: VorlageInfo) => {
    setInput(slashStart(v));
    setSlashZu(true);
    inputRef.current?.focus();
  };
  const suggestions = tree.length === 0 ? FIRST_SUGGESTIONS : SUGGESTIONS;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getUsage().then((u) => setUsage(u.session)).catch(() => {});
  }, []);

  const addFiles = async (files: FileList | File[]) => {
    setAttachProblem(null);
    let images = attachments.reduce((n, a) => n + a.images.length, 0);
    let docs = attachments.filter((a) => a.text !== undefined).length;
    let problem: string | null = null;
    for (const file of [...files]) {
      const isImage = file.type.startsWith("image/");
      if (isImage ? images >= MAX_IMAGES : docs >= MAX_FILES) {
        problem = isImage ? `Es passen höchstens ${MAX_IMAGES} Bilder in eine Nachricht.` : `Es passen höchstens ${MAX_FILES} Dateien in eine Nachricht.`;
        continue;
      }
      const result = await readAttachment(file);
      if (typeof result === "string") {
        problem = result;
        continue;
      }
      if (result.images.length > 0 && usage && !usage.vision) {
        problem = "Dieses Modell versteht keine Bilder. Wähle in den Einstellungen ein Modell mit Bildern.";
        continue;
      }
      images += result.images.length;
      if (result.text !== undefined) docs++;
      setAttachments((a) => [...a, result]);
    }
    setAttachProblem(problem);
  };
  // Files can be dropped anywhere in the window.
  const addRef = useRef(addFiles);
  addRef.current = addFiles;
  useEffect(() => {
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer) void addRef.current(e.dataTransfer.files);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);
  const endRef = useRef<HTMLDivElement>(null);

  // The input grows with the text, up to about eight lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Scroll only the message list, never the whole page (scrollIntoView would also move the sidebar).
  useEffect(() => {
    const list = endRef.current?.closest(".scroll");
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const patchLast = (fn: (m: Message) => Message) =>
    setMessages((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));

  const handleEvent = (e: ChatEvent) => {
    switch (e.type) {
      case "text":
        patchLast((m) => ({ ...m, text: m.text + e.delta, retryNote: undefined }));
        break;
      case "fragen":
        melde("frage");
        setBuilding(null);
        patchLast((m) => ({ ...m, offeneFragen: { id: e.id, fragen: e.fragen } }));
        break;
      case "fragen_beantwortet":
        patchLast((m) => ({ ...m, offeneFragen: undefined, fragen: [...(m.fragen ?? []), ...e.antworten] }));
        break;
      case "retry":
        patchLast((m) => ({
          ...m,
          text: m.text.slice(0, Math.max(0, m.text.length - e.dropText)),
          error: undefined,
          retryable: undefined,
          retryNote: e.attempt > 0 ? `${e.message} Neuer Versuch in ${e.seconds} ${e.seconds === 1 ? "Sekunde" : "Sekunden"} (${e.attempt} von ${e.max}) …` : undefined,
        }));
        break;
      case "thinking":
        setThinking(e.active);
        break;
      case "usage":
        setUsage(e.usage);
        break;
      case "material": {
        madeTitles.current.push(e.title);
        const m = { title: e.title, name: e.name, path: e.path };
        patchLast((x) => ({ ...x, materials: [...(x.materials ?? []), m] }));
        if (e.preview !== false && !(previewSet.current && nurFuerLehrkraft(e.title))) {
          setPreview(m);
          previewSet.current = true;
        }
        setBuilding(null);
        break;
      }
      case "step_start":
        patchLast((m) => ({ ...m, steps: [...m.steps, { id: e.id, label: e.label, state: "running" }] }));
        if (e.material) setBuilding({ id: e.id, label: e.label });
        break;
      case "step_end":
        setBuilding((b) => (b?.id === e.id ? null : b));
        patchLast((m) => ({
          ...m,
          steps: m.steps.map((s) => (s.id === e.id ? { ...s, state: e.ok ? "done" : "failed" } : s)),
        }));
        break;
      case "confirm":
        melde("frage");
        // While the question is open the placeholder waits: nothing is being built yet.
        setBuilding((b) => {
          held.current = b;
          return null;
        });
        patchLast((m) => ({ ...m, confirm: { id: e.id, question: e.question } }));
        break;
      case "error":
        sawError.current = true;
        patchLast((m) => ({ ...m, text: m.text.slice(0, Math.max(0, m.text.length - (e.dropText ?? 0))), error: e.message, retryable: e.retryable, retryNote: undefined }));
        break;
    }
  };

  const decide = (id: string, allow: boolean) => {
    patchLast((m) => ({ ...m, confirm: undefined }));
    if (allow && held.current) setBuilding(held.current);
    held.current = null;
    void answerConfirm(id, allow);
  };

  const submit = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || working) return;
    const sent = attachments;
    setInput("");
    setAttachments([]);
    setAttachProblem(null);
    setWorking(true);
    setMessages((all) => [
      ...all,
      { role: "user", text, images: sent.flatMap((a) => (a.preview ? [a.preview] : [])), dateien: sent.filter((a) => a.text !== undefined).map((a) => a.name), steps: [] },
      { role: "assistant", text: "", steps: [] },
    ]);
    await stream((signal, onEvent) => sendMessage(text, sent.flatMap((a) => a.images), sent.flatMap((a) => (a.text !== undefined ? [{ name: a.name, text: a.text }] : [])), onEvent, signal));
  };

  /** Runs one request to the assistant and takes care of what happens when the connection breaks. */
  async function stream(run: (signal: AbortSignal, onEvent: (e: ChatEvent) => void) => Promise<void>) {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let finished = false;
    madeTitles.current = [];
    sawError.current = false;
    previewSet.current = false;
    try {
      await run(ctrl.signal, (e) => {
        if (e.type === "done") finished = true;
        handleEvent(e);
      });
      // The answer ended without the closing sign: the connection to the app broke.
      if (!finished && !ctrl.signal.aborted) patchLast((m) => ({ ...m, error: "Die Verbindung wurde unterbrochen.", retryable: true, retryNote: undefined }));
    } catch (err) {
      if (!ctrl.signal.aborted) {
        const broken = err instanceof TypeError;
        patchLast((m) => ({ ...m, error: broken ? "Ich erreiche Pult gerade nicht. Läuft das Programm noch?" : err instanceof Error ? err.message : "Das hat nicht geklappt.", retryable: broken || undefined, retryNote: undefined }));
      }
    } finally {
      if (!ctrl.signal.aborted) melde(finished && !sawError.current ? "fertig" : "fehler", madeTitles.current);
      setWorking(false);
      setThinking(false);
      setBuilding(null);
      patchLast((m) => (m.retryNote ? { ...m, retryNote: undefined } : m));
      refreshTree();
      refreshHistory();
    }
  }

  const retry = async () => {
    if (working) return;
    setWorking(true);
    patchLast((m) => ({ ...m, error: undefined, retryable: undefined }));
    await stream((signal, onEvent) => retryMessage(onEvent, signal));
  };

  /** Puts a question into the input field and shows the chat, so the teacher can read it and send it. */
  const started = useRef(false);
  useEffect(() => {
    if (startText && !started.current) {
      started.current = true;
      void submit(startText);
    }
    // Only once when the conversation opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = (text: string) => {
    setInput(text);
    setView("chat");
    inputRef.current?.focus();
  };

  const newChat = async () => {
    abortRef.current?.abort();
    await resetChat();
    onNew();
  };

  const last = messages.at(-1);
  const running = last?.steps.find((s) => s.state === "running");
  const statusLine = !working
    ? null
    : last?.retryNote
      ? last.retryNote
      : last?.offeneFragen
        ? "Ich warte auf deine Antworten …"
        : last?.confirm
      ? "Ich warte auf deine Antwort …"
      : running
      ? `${running.label} …`
      : thinking
        ? "Ich überlege …"
        : last?.text
          ? "Ich schreibe …"
          : "Einen Moment …";

  return (
    <div className={`shell${statusLine ? " is-busy" : ""}${preview || building ? " with-preview" : ""}${navOpen ? " nav-open" : ""}`}>
      <aside
        className="side"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) setNavOpen(false);
        }}
      >
        <div className="side-top">
          <Logo />
          <button type="button" className="side-close" aria-label="Menü schließen">
            ×
          </button>
        </div>
        <button type="button" className={view === "start" ? "nav-item on" : "nav-item"} onClick={() => setView("start")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          Start
        </button>
        <button type="button" className={view === "material" ? "nav-item on" : "nav-item"} onClick={() => setView("material")}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
          </svg>
          Material
        </button>
        <button className="new-chat" onClick={() => { setView("chat"); void newChat(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Neues Gespräch
        </button>
        <div className="side-scroll">
        {history.length > 0 && <Gespraechsliste history={history} currentId={currentId} onOpen={onOpen} onDelete={onDelete} onChanged={refreshHistory} />}
        <nav className="tree" aria-label="Deine Klassen">
          <div className="tree-head">
            <span>Klassen</span>
            <button type="button" onClick={onNewClass}>+ Neue Klasse</button>
          </div>
          {tree.length === 0 && <p className="side-note">Noch keine Klasse. Lege die erste an, dann kann ich mit ihr arbeiten.</p>}
          {tree.map((k) => (
            <div key={k.name} className="tree-klasse">
              <button type="button" className="tree-node k" onClick={() => ask(`Wo stehen wir in ${k.name}?`)}>
                <span className="legend-dot" style={{ background: classVar(classColors(tree.map((x) => x.name)), k.name) }} aria-hidden />
                {k.name}
              </button>
              {k.faecher.map((f) => (
                <div key={f.name}>
                  <button type="button" className="tree-node f" onClick={() => ask(`Wo stehen wir in ${k.name}, ${f.name}?`)}>
                    {f.name}
                  </button>
                  {f.reihen.map((r) => (
                    <button
                      type="button"
                      key={r.name}
                      className="tree-node r"
                      title={`${r.gehalten} von ${r.stunden} Stunden gehalten`}
                      onClick={() => ask(`Wie weit sind wir in der Reihe „${r.name.replace(/^\d+\s+/, "")}“ in ${k.name}, ${f.name}?`)}
                    >
                      {r.name}
                      {r.ohneMaterial > 0 && <span className="badge">{r.ohneMaterial} ohne Material</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </nav>
        </div>
        <div className="side-foot">
          <button type="button" className="foot-btn" onClick={onVorlagen}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="3" width="16" height="18" rx="2.5" />
              <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
            Vorlagen
          </button>
          <button type="button" className="foot-btn" onClick={onLehrplan}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5z" />
              <path d="M4 21.5V5.5M8 7h8" />
            </svg>
            Lehrpläne
          </button>
          <button type="button" className="foot-btn" onClick={onSettings}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
            </svg>
            Einstellungen
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <main className="main">
        <div className="topbar">
          <button type="button" className="menu-btn" aria-label="Menü öffnen" aria-expanded={navOpen} onClick={() => setNavOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Logo small />
        </div>
        {view === "start" ? (
          <div className="scroll">
            <Start key={planVersion} tree={tree} onSetup={onStundenplan} onAsk={ask} onChanged={refreshTree} onNewClass={onNewClass} />
          </div>
        ) : view === "material" ? (
          <div className="scroll">
            <MaterialSeite tree={tree} onPreview={setPreview} onAsk={ask} />
          </div>
        ) : (
          <>
        {currentId && messages.length > 0 && (
          <div className="chat-bar">
            <a className="export-link" href={`/api/history/${currentId}/export`} download title="Speichert das ganze Gespräch als Textdatei, zum Beispiel, um Rückmeldung zu geben">
              Gespräch exportieren
            </a>
          </div>
        )}
        <div className="scroll">
          <div className="column">
            {messages.length > 0 && <h1 className="sr-only">Gespräch</h1>}
            {messages.length === 0 && (
              <div className="hello">
                <h1>Woran arbeiten wir heute?</h1>
                <p>Schreib einfach, was du brauchst. Ich frage nach, wenn mir etwas fehlt.</p>
                <div className="suggest">
                  {suggestions.map((q, qi) => (
                    <button key={q} type="button" style={{ "--i": qi } as CSSProperties} onClick={() => void submit(q)}>
                      {q}
                    </button>
                  ))}
                  <button
                    type="button"
                    style={{ "--i": suggestions.length } as CSSProperties}
                    onClick={() => {
                      setInput((t) => t || "Bau mir so etwas wie auf diesem Bild, mit eigenen Aufgaben.");
                      fileRef.current?.click();
                    }}
                  >
                    Aus einem Foto ein Blatt bauen
                  </button>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === "assistant" && m.steps.length > 0 && (
                  <ul className="steps">
                    {m.steps.map((s) => (
                      <li key={s.id} className={s.state}>
                        <span className="tick" aria-hidden>
                          {s.state === "done" ? "✓" : s.state === "failed" ? "!" : ""}
                        </span>
                        {s.label}
                      </li>
                    ))}
                  </ul>
                )}
                {m.images && m.images.length > 0 && (
                  <div className="thumbs">
                    {m.images.map((src, j) => (
                      <img key={j} src={src} alt="Angehängtes Bild" />
                    ))}
                  </div>
                )}
                {m.dateien && m.dateien.length > 0 && (
                  <ul className="sent-files">
                    {m.dateien.map((n, j) => (
                      <li key={j}>{n}</li>
                    ))}
                  </ul>
                )}
                {m.bilder ? <p className="muted-note">{m.bilder === 1 ? "1 Bild angehängt" : `${m.bilder} Bilder angehängt`}</p> : null}
                {m.role === "user" ? <p>{m.text}</p> : m.text && <Markdown>{m.text}</Markdown>}
                {m.text && !(working && i === messages.length - 1) && <CopyButton text={m.text} />}
                {groupMaterials(m.materials ?? []).map((g) => (
                  <div key={g.title} className="file-group">
                    <div className="file-group-head">
                      <span className="file-icon" aria-hidden>{g.parts.some((p) => isSlides(p.file)) ? "PPT" : g.parts.some((p) => isHtml(p.file)) ? "ANI" : g.parts.some((p) => !isDownload(p.file)) ? "PDF" : "DOC"}</span>
                      <strong>{g.title}</strong>
                    </div>
                    <div className="file-actions">
                      {g.parts.map((p) =>
                        isDownload(p.file) ? (
                          <a key={p.file.path} className="file-action" href={materialUrl(p.file, true)} download={p.file.name}>
                            {p.label} <small>herunterladen</small>
                          </a>
                        ) : (
                          <button key={p.file.path} type="button" className="file-action" onClick={() => setPreview(p.file)}>
                            {p.label} <small>ansehen</small>
                          </button>
                        ),
                      )}
                    </div>
                    {currentId && !working && <RueckmeldungKnoepfe gespraech={currentId} pfad={g.parts[0]!.file.path} bisher={g.parts.map((p) => rueck[p.file.path]).find(Boolean)} onSaved={(list) => setRueck(Object.fromEntries(list.map((r) => [r.pfad, r])))} />}
                  </div>
                ))}
                {(m.materials?.length ?? 0) > 1 && (
                  <a className="zip-link" href={zipUrl(m.materials!.map((x) => x.path), m.materials![0]!.title.replace(/ \(.*\)$/, ""))} download>
                    Alles als ZIP herunterladen ({m.materials!.length} Dateien)
                  </a>
                )}
                {m.role === "assistant" && (m.materials?.length ?? 0) > 0 && !working && i === messages.length - 1 && (
                  <div className="follow-ups">
                    <div className="chips" role="group" aria-label="Das Ergebnis anpassen">
                      {followUps(m.materials!).map((f) => (
                        <button key={f.label} type="button" onClick={() => void submit(f.text)}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="make-template" onClick={() => void submit("Ich möchte aus diesem Ergebnis eine eigene Vorlage machen.")}>
                      Daraus eine Vorlage machen
                    </button>
                  </div>
                )}
                {m.confirm && (
                  <div className="confirm" role="alertdialog" aria-label="Rückfrage">
                    <p>{m.confirm.question}</p>
                    <div>
                      <button type="button" className="primary" autoFocus onClick={() => decide(m.confirm!.id, true)}>
                        Ja, bitte
                      </button>
                      <button type="button" className="ghost" onClick={() => decide(m.confirm!.id, false)}>
                        Nein
                      </button>
                    </div>
                  </div>
                )}
                {m.fragen && m.fragen.length > 0 && <FragenRueckblick fragen={m.fragen} />}
                {m.offeneFragen && <Fragen key={m.offeneFragen.id} id={m.offeneFragen.id} fragen={m.offeneFragen.fragen} />}
                {m.error && (
                  <div className="error-box" role="alert">
                    <p className="error">{m.error}</p>
                    {m.retryable && !working && i === messages.length - 1 && (
                      <button type="button" className="ghost small" onClick={() => void retry()}>
                        Nochmal versuchen
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {statusLine && (
              <div className="status" role="status" aria-live="polite">
                <span className="dots" aria-hidden><i /><i /><i /></span>
                {statusLine}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {dragging && (
          <div className="drop-overlay" aria-hidden>
            <p>Hier loslassen, um die Dateien anzuhängen</p>
          </div>
        )}
        {!online && (
          <p className="offline-bar" role="status">
            Du bist gerade offline. Sobald das Internet wieder da ist, kannst du weiterschreiben.
          </p>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="composer-box">
            {attachments.length > 0 && (
              <div className="attached">
                <ul>
                  {attachments.map((a) => (
                    <li key={a.id} className={a.preview ? "pic" : "doc"}>
                      {a.preview ? (
                        <img src={a.preview} alt={a.name} />
                      ) : (
                        <span className="doc-chip">
                          <span className="doc-kind" aria-hidden>{a.art}</span>
                          <span className="doc-name">
                            <strong>{a.name}</strong>
                            <small>{[a.info, a.gekuerzt ? "gekürzt" : "", a.images.length ? "Seiten als Bild" : ""].filter(Boolean).join(" · ") || "bereit"}</small>
                          </span>
                        </span>
                      )}
                      <button type="button" aria-label={`${a.name} entfernen`} onClick={() => setAttachments(attachments.filter((x) => x.id !== a.id))}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <p>Bitte keine Namen von Schülerinnen und Schülern und keine Klassenarbeiten mit Namen. Bilder und Dateien gehen an deinen KI-Anbieter.</p>
              </div>
            )}
            {attachProblem && <p className="error">{attachProblem}</p>}
            {slashOffen && (
              <div className="slash">
                <ul id="slash-liste" role="listbox" aria-label="Anleitungen">
                  {treffer.map((v, i) => (
                    <li key={v.name} id={`slash-${v.name}`} role="option" aria-selected={i === slashAktiv} className={i === slashAktiv ? "on" : ""} onMouseEnter={() => setSlashAktiv(i)} onMouseDown={(e) => { e.preventDefault(); waehle(v); }}>
                      <strong>{v.titel}</strong>
                      {v.eigene && <em>eigene</em>}
                      <small>{kurz(v.beschreibung)}</small>
                    </li>
                  ))}
                </ul>
                <p className="slash-hinweis" role="status">
                  {treffer.length ? `${treffer.length} ${treffer.length === 1 ? "Anleitung" : "Anleitungen"}. Mit den Pfeiltasten wählen, mit Enter einsetzen, mit Esc schließen.` : "Dazu gibt es keine Anleitung. Schreib einfach, was du brauchst."}
                </p>
              </div>
            )}
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              placeholder="Schreib hier, was du brauchst. Mit / siehst du, was ich kann."
              aria-label="Deine Nachricht"
              onChange={(e) => {
                setInput(e.target.value);
                setSlashZu(false);
                setSlashAktiv(0);
              }}
              role="combobox"
              aria-expanded={slashOffen}
              aria-controls="slash-liste"
              aria-autocomplete="list"
              aria-activedescendant={slashOffen && treffer[slashAktiv] ? `slash-${treffer[slashAktiv]!.name}` : undefined}
              onPaste={(e) => {
                const files = [...e.clipboardData.files];
                if (files.length) {
                  e.preventDefault();
                  void addFiles(files);
                }
              }}
              onKeyDown={(e) => {
                if (slashOffen && !e.nativeEvent.isComposing) {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    if (treffer.length) setSlashAktiv((i) => (i + (e.key === "ArrowDown" ? 1 : treffer.length - 1)) % treffer.length);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setSlashZu(true);
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    if (treffer[slashAktiv]) waehle(treffer[slashAktiv]!);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="composer-bar">
              <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
              <button type="button" className="icon-btn" title="Datei oder Bild anhängen" aria-label="Datei oder Bild anhängen" onClick={() => fileRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.6-8.6a3.7 3.7 0 015.2 5.2l-8.6 8.6a1.8 1.8 0 01-2.6-2.6l7.9-7.9" />
                </svg>
              </button>
              <span className="grow" />
              <ModelInfo status={status} onSettings={onSettings} />
              <UsageMeter usage={usage} />
              {working ? (
                <button type="button" className="stop" onClick={() => abortRef.current?.abort()}>
                  Anhalten
                </button>
              ) : (
                <button type="submit" className="send" disabled={!input.trim()}>
                  Senden
                </button>
              )}
            </div>
          </div>
        </form>
          </>
        )}
      </main>

      {building && (
        <aside className="preview" aria-label="Vorschau" aria-busy="true">
          <div className="preview-head">
            <strong>Dein Material entsteht …</strong>
          </div>
          <div className="preview-wait" role="status">
            <div className="sheet-skeleton" aria-hidden>
              <span className="b title" />
              <span className="b line" />
              <span className="b box" />
              <span className="b num" />
              <span className="b line" />
              <span className="b rule" />
              <span className="b rule" />
              <span className="b num" />
              <span className="b line short" />
              <span className="b rule" />
              <span className="b rule" />
            </div>
            <p>{building.label} …</p>
          </div>
        </aside>
      )}
      {!building && preview && (
        <aside className="preview" aria-label="Vorschau">
          <div className="preview-head">
            <strong>{preview.title}</strong>
            <a className="ghost" href={materialUrl(preview, true)} download={preview.name}>
              Herunterladen
            </a>
            <button type="button" className="ghost" onClick={() => setPreview(null)}>
              Schließen
            </button>
          </div>
          <iframe title={preview.title} src={isHtml(preview) ? materialUrl(preview) : `${materialUrl(preview)}#toolbar=0&navpanes=0&view=FitH`} sandbox={isHtml(preview) ? "allow-scripts" : undefined} />
        </aside>
      )}
    </div>
  );
}
