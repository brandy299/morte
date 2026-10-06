import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";
import { startTheme } from "./theme.ts";

startTheme();

createRoot(document.getElementById("root")!).render(<App />);
