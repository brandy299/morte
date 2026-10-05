import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { answerConfirm, getStatus, getTree, resetChat, sendMessage, type ChatEvent, type KlasseInfo, type SetupStatus } from "./api.ts";
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
  steps: Step[];
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
  const abortRef = useRef<AbortController | null>(null);
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
    setInput("");
    setWorking(true);
    setMessages((all) => [...all, { role: "user", text, steps: [] }, { role: "assistant", text: "", steps: [] }]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await sendMessage(text, handleEvent, ctrl.signal);
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
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          morte
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
                {m.role === "user" ? <p>{m.text}</p> : m.text && <Markdown>{m.text}</Markdown>}
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
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <textarea
            value={input}
            rows={2}
            placeholder="Schreib hier, was du brauchst …"
            onChange={(e) => setInput(e.target.value)}
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
        </form>
      </main>
    </div>
  );
}
