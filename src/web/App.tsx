import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { answerConfirm, getStatus, getTree, getUsage, materialUrl, resetChat, sendMessage, type ChatEvent, type KlasseInfo, type Material, type SetupStatus, type UsageSnapshot } from "./api.ts";
import { MAX_IMAGES, readImage, type Attachment } from "./attachments.ts";
import { UsageMeter } from "./UsageMeter.tsx";
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
  steps: Step[];
  materials?: Material[];
  confirm?: { id: string; question: string };
  error?: string;
}

export function App() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [tree, setTree] = useState<KlasseInfo[]>([]);
  const refreshTree = () => getTree().then(setTree).catch(() => {});
  const refresh = () => getStatus().then(setStatus);
  useEffect(() => {
    void refresh();
    void refreshTree();
  }, []);

  if (!status) return null;
  if (newClassOpen) {
    return (
      <NewClass
        onCancel={() => setNewClassOpen(false)}
        onDone={() => {
          setNewClassOpen(false);
          void refreshTree();
        }}
      />
    );
  }
  if (!status.configured || setupOpen) {
    return (
      <Setup
        status={status}
        onDone={() => {
          setSetupOpen(false);
          void refresh();
        }}
      />
    );
  }
  return <Chat tree={tree} refreshTree={refreshTree} onNewClass={() => setNewClassOpen(true)} onSettings={() => setSetupOpen(true)} />;
}

interface ChatProps {
  tree: KlasseInfo[];
  refreshTree: () => void;
  onNewClass: () => void;
  onSettings: () => void;
}

const SUGGESTIONS = ["Welche Klassen habe ich?", "Wo fehlt noch Material?"];

function Chat({ tree, refreshTree, onNewClass, onSettings }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachProblem, setAttachProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [usage, setUsage] = useState<UsageSnapshot | undefined>();
  const [preview, setPreview] = useState<Material | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
        break;
      }
      case "step_start":
        patchLast((m) => ({ ...m, steps: [...m.steps, { id: e.id, label: e.label, state: "running" }] }));
        break;
      case "step_end":
        patchLast((m) => ({
          ...m,
          steps: m.steps.map((s) => (s.id === e.id ? { ...s, state: e.ok ? "done" : "failed" } : s)),
        }));
        break;
      case "confirm":
        patchLast((m) => ({ ...m, confirm: { id: e.id, question: e.question } }));
        break;
      case "error":
        patchLast((m) => ({ ...m, error: e.message }));
        break;
    }
  };

  const decide = (id: string, allow: boolean) => {
    patchLast((m) => ({ ...m, confirm: undefined }));
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
      refreshTree();
    }
  };

  const newChat = async () => {
    abortRef.current?.abort();
    await resetChat();
    setMessages([]);
    setPreview(null);
    setUsage((u) => (u ? { ...u, inputTokens: 0, outputTokens: 0, cost: 0, contextTokens: 0 } : u));
    refreshTree();
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
    <div className={preview ? "shell with-preview" : "shell"}>
      <aside className="side">
        <div className="brand">
          <img src="/pult-logo.svg" alt="Pult" />
        </div>
        <button className="new" onClick={newChat}>
          Neues Gespräch
        </button>
        <button className="new" onClick={onSettings}>
          Einstellungen
        </button>
        <nav className="tree" aria-label="Deine Klassen">
          <div className="tree-head">
            <span>Klassen</span>
            <button type="button" onClick={onNewClass}>+ Neue Klasse</button>
          </div>
          {tree.length === 0 && <p className="side-note">Noch keine Klasse. Lege die erste an, dann kann ich mit ihr arbeiten.</p>}
          {tree.map((k) => (
            <div key={k.name} className="tree-klasse">
              <button type="button" className="tree-node k" onClick={() => setInput(`Wo stehen wir in ${k.name}?`)}>
                {k.name}
              </button>
              {k.faecher.map((f) => (
                <div key={f.name}>
                  <button type="button" className="tree-node f" onClick={() => setInput(`Wo stehen wir in ${k.name}, ${f.name}?`)}>
                    {f.name}
                  </button>
                  {f.reihen.map((r) => (
                    <button
                      type="button"
                      key={r.name}
                      className="tree-node r"
                      title={`${r.gehalten} von ${r.stunden} Stunden gehalten`}
                      onClick={() => setInput(`Wie weit sind wir in der Reihe „${r.name.replace(/^\d+\s+/, "")}“ in ${k.name}, ${f.name}?`)}
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
      </aside>

      <main className="main">
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
          <div className="composer-row">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
            <button type="button" className="clip" title="Bild anhängen" aria-label="Bild anhängen" onClick={() => fileRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 11.5l-8.6 8.6a5.5 5.5 0 01-7.8-7.8l8.6-8.6a3.7 3.7 0 015.2 5.2l-8.6 8.6a1.8 1.8 0 01-2.6-2.6l7.9-7.9" />
              </svg>
            </button>
            <textarea
              value={input}
              rows={2}
              placeholder="Schreib hier, was du brauchst …"
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
            {working ? (
              <button type="button" onClick={() => abortRef.current?.abort()}>
                Anhalten
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()}>
                Senden
              </button>
            )}
            <UsageMeter usage={usage} />
          </div>
        </form>
      </main>

      {preview && (
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
          <iframe title={preview.title} src={`${materialUrl(preview)}#toolbar=0&navpanes=0`} />
        </aside>
      )}
    </div>
  );
}
