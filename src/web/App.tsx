import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { answerConfirm, deleteHistory, getHistory, getPlanStatus, getStatus, getTree, openHistory, getUsage, materialUrl, resetChat, sendMessage, type ChatEvent, type ConversationInfo, type StoredMessage, type KlasseInfo, type Material, type SetupStatus, type UsageSnapshot } from "./api.ts";
import { MAX_IMAGES, readImage, type Attachment } from "./attachments.ts";
import { UsageMeter } from "./UsageMeter.tsx";
import { Lehrplan } from "./Lehrplan.tsx";
import { Start } from "./Start.tsx";
import { Stundenplan } from "./Stundenplan.tsx";
import { NewClass } from "./NewClass.tsx";
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
  /** Pictures that were attached in an earlier session; only the number is known. */
  bilder?: number;
  steps: Step[];
  materials?: Material[];
  confirm?: { id: string; question: string };
  error?: string;
}

export function App() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [lehrplanOpen, setLehrplanOpen] = useState(false);
  const [stundenplanOpen, setStundenplanOpen] = useState(false);
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
  const [chat, setChat] = useState<{ key: number; messages: Message[] }>({ key: 0, messages: [] });
  const show = (anzeige: StoredMessage[]) => {
    setStartView("chat");
    setChat((c) => ({ key: c.key + 1, messages: anzeige.map((m) => ({ ...m, materials: m.materials })) }));
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
  const refresh = () => getStatus().then(setStatus);
  useEffect(() => {
    void refresh();
    void refreshTree();
    void refreshHistory();
    getPlanStatus().then((p) => setStartView((v) => v ?? (p.vorhanden ? "start" : "chat"))).catch(() => setStartView((v) => v ?? "chat"));
  }, []);

  if (!status || !startView) return null;
  // First start: only the setup. Afterwards the chat stays mounted behind the other screens,
  // so an answer that is still being written and the conversation on screen are not lost.
  if (!status.configured) {
    return (
      <Setup
        status={status}
        onDone={() => {
          void refresh();
          show([]);
          void refreshHistory();
        }}
      />
    );
  }
  const overlay = setupOpen || newClassOpen || lehrplanOpen || stundenplanOpen;
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
          onLehrplan={() => setLehrplanOpen(true)}
          onSettings={() => setSetupOpen(true)}
        />
      </div>
      {setupOpen && (
        <Setup
          status={status}
          onCancel={() => setSetupOpen(false)}
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
  onSettings: () => void;
}

const SUGGESTIONS = ["Welche Klassen habe ich?", "Wo fehlt noch Material?"];

function Chat({ initialMessages, initialView, planVersion, onStundenplan, history, currentId, refreshHistory, onOpen, onDelete, onNew, tree, refreshTree, onNewClass, onLehrplan, onSettings }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [view, setView] = useState<"chat" | "start">(initialView);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachProblem, setAttachProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [usage, setUsage] = useState<UsageSnapshot | undefined>();
  const [preview, setPreview] = useState<Material | null>(null);
  // A material step is running: the preview opens at once with a placeholder and is replaced by the file.
  const [building, setBuilding] = useState<{ id: string; label: string } | null>(null);
  const held = useRef<{ id: string; label: string } | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getUsage().then((u) => setUsage(u.session)).catch(() => {});
  }, []);

  const addFiles = async (files: FileList | File[]) => {
    setAttachProblem(null);
    const list = [...files];
    if (usage && !usage.vision) return setAttachProblem("Dieses Modell versteht keine Bilder. Wähle in den Einstellungen ein Modell mit Bildern.");
    const room = MAX_IMAGES - attachments.length;
    if (list.length > room) setAttachProblem(`Es passen höchstens ${MAX_IMAGES} Bilder in eine Nachricht.`);
    for (const file of list.slice(0, Math.max(0, room))) {
      const result = await readImage(file);
      if (typeof result === "string") setAttachProblem(result);
      else setAttachments((a) => [...a, result]);
    }
  };
  const endRef = useRef<HTMLDivElement>(null);

  // The input grows with the text, up to about eight lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, thinking]);

  const patchLast = (fn: (m: Message) => Message) =>
    setMessages((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));

  const handleEvent = (e: ChatEvent) => {
    switch (e.type) {
      case "text":
        patchLast((m) => ({ ...m, text: m.text + e.delta }));
        break;
      case "thinking":
        setThinking(e.active);
        break;
      case "usage":
        setUsage(e.usage);
        break;
      case "material": {
        const m = { title: e.title, name: e.name, path: e.path };
        patchLast((x) => ({ ...x, materials: [...(x.materials ?? []), m] }));
        if (e.preview !== false) setPreview(m);
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
        // While the question is open the placeholder waits: nothing is being built yet.
        setBuilding((b) => {
          held.current = b;
          return null;
        });
        patchLast((m) => ({ ...m, confirm: { id: e.id, question: e.question } }));
        break;
      case "error":
        patchLast((m) => ({ ...m, error: e.message }));
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
      { role: "user", text, images: sent.map((a) => a.preview), steps: [] },
      { role: "assistant", text: "", steps: [] },
    ]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await sendMessage(text, sent.map(({ data, mimeType }) => ({ data, mimeType })), handleEvent, ctrl.signal);
    } catch (err) {
      if (!ctrl.signal.aborted) patchLast((m) => ({ ...m, error: err instanceof Error ? err.message : "Das hat nicht geklappt." }));
    } finally {
      setWorking(false);
      setThinking(false);
      setBuilding(null);
      refreshTree();
      refreshHistory();
    }
  };

  /** Puts a question into the input field and shows the chat, so the teacher can read it and send it. */
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
    <div className={`shell${preview || building ? " with-preview" : ""}${navOpen ? " nav-open" : ""}`}>
      <aside
        className="side"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) setNavOpen(false);
        }}
      >
        <div className="side-top">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            morte
          </div>
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
        <button className="new-chat" onClick={() => { setView("chat"); void newChat(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Neues Gespräch
        </button>
        <div className="side-scroll">
        {history.length > 0 && (
          <nav className="tree history" aria-label="Frühere Gespräche">
            <div className="tree-head">
              <span>Gespräche</span>
            </div>
            {history.slice(0, 12).map((c) => (
              <div key={c.id} className={c.id === currentId ? "hist on" : "hist"}>
                <button type="button" className="tree-node" title={c.titel} onClick={() => onOpen(c.id)}>
                  {c.titel}
                </button>
                <button type="button" className="hist-del" aria-label={`Gespräch „${c.titel}“ löschen`} onClick={() => onDelete(c)}>
                  ×
                </button>
              </div>
            ))}
            <p className="side-note">Gespräche bleiben auf diesem Computer.</p>
          </nav>
        )}
        <nav className="tree" aria-label="Deine Klassen">
          <div className="tree-head">
            <span>Klassen</span>
            <button type="button" onClick={onNewClass}>+ Neue Klasse</button>
          </div>
          {tree.length === 0 && <p className="side-note">Noch keine Klasse. Lege die erste an, dann kann ich mit ihr arbeiten.</p>}
          {tree.map((k) => (
            <div key={k.name} className="tree-klasse">
              <button type="button" className="tree-node k" onClick={() => ask(`Wo stehen wir in ${k.name}?`)}>
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
          <span className="brand-small">morte</span>
        </div>
        {view === "start" ? (
          <div className="scroll">
            <Start key={planVersion} tree={tree} onSetup={onStundenplan} onAsk={ask} onChanged={refreshTree} />
          </div>
        ) : (
          <>
        <div className="scroll">
          <div className="column">
            {messages.length === 0 && (
              <div className="hello">
                <h1>Woran arbeiten wir heute?</h1>
                <p>Schreib einfach, was du brauchst. Ich frage nach, wenn mir etwas fehlt.</p>
                <div className="suggest">
                  {SUGGESTIONS.map((q) => (
                    <button key={q} type="button" onClick={() => void submit(q)}>
                      {q}
                    </button>
                  ))}
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
                {m.bilder ? <p className="muted-note">{m.bilder === 1 ? "1 Bild angehängt" : `${m.bilder} Bilder angehängt`}</p> : null}
                {m.role === "user" ? <p>{m.text}</p> : m.text && <Markdown>{m.text}</Markdown>}
                {m.materials?.map((x) => (
                  <button key={x.path} type="button" className="file-card" onClick={() => setPreview(x)}>
                    <span className="file-icon" aria-hidden>PDF</span>
                    <span>
                      <strong>{x.title}</strong>
                      <small>Zum Ansehen öffnen</small>
                    </span>
                  </button>
                ))}
                {m.confirm && (
                  <div className="confirm" role="alertdialog" aria-label="Rückfrage">
                    <p>{m.confirm.question}</p>
                    <div>
                      <button type="button" className="primary" onClick={() => decide(m.confirm!.id, true)}>
                        Ja, bitte
                      </button>
                      <button type="button" className="ghost" onClick={() => decide(m.confirm!.id, false)}>
                        Nein
                      </button>
                    </div>
                  </div>
                )}
                {m.error && <p className="error">{m.error}</p>}
              </div>
            ))}
            {statusLine && (
              <div className="status" role="status" aria-live="polite">
                <span className="pulse" aria-hidden />
                {statusLine}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form
          className={dragging ? "composer drop" : "composer"}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
        >
          <div className="composer-box">
            {attachments.length > 0 && (
              <div className="attached">
                <ul>
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <img src={a.preview} alt={a.name} />
                      <button type="button" aria-label={`${a.name} entfernen`} onClick={() => setAttachments(attachments.filter((x) => x.id !== a.id))}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <p>Bitte keine Namen von Schülerinnen und Schülern und keine Klassenarbeiten mit Namen. Das Bild geht an deinen KI-Anbieter.</p>
              </div>
            )}
            {attachProblem && <p className="error">{attachProblem}</p>}
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              placeholder="Schreib hier, was du brauchst …"
              aria-label="Deine Nachricht"
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => {
                const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
                if (files.length) {
                  e.preventDefault();
                  void addFiles(files);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="composer-bar">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
              <button type="button" className="icon-btn" title="Bild anhängen" aria-label="Bild anhängen" onClick={() => fileRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.6-8.6a3.7 3.7 0 015.2 5.2l-8.6 8.6a1.8 1.8 0 01-2.6-2.6l7.9-7.9" />
                </svg>
              </button>
              <span className="grow" />
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
          <iframe title={preview.title} src={`${materialUrl(preview)}#toolbar=0&navpanes=0&view=FitH`} />
        </aside>
      )}
    </div>
  );
}
