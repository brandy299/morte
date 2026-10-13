import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

/** Short commit of the build, so a tester can tell which version they have. Empty when git is not there (zip without history). */
const commit = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
})();

export default defineConfig({
  root: "src/web",
  define: { __PULT_VERSION__: JSON.stringify(pkg.version), __PULT_COMMIT__: JSON.stringify(commit) },
  plugins: [react()],
  build: { outDir: "../../dist/web", emptyOutDir: true },
  server: { port: 5173, proxy: { "/api/": "http://127.0.0.1:3001" } },
});
