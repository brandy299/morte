import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";
import { startTheme } from "./theme.ts";

startTheme();

createRoot(document.getElementById("root")!).render(<App />);

// The dev pencil is its own bundle part and only loads when the server says it is on (PULT_STIFT=1).
void fetch("/api/stift/status")
  .then((r) => r.json())
  .then((d: { aktiv?: boolean }) => (d.aktiv ? import("./Stift.tsx").then((m) => m.startStift()) : undefined))
  .catch(() => {});
