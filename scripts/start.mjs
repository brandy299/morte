// Starts the server. Before that it tells Node to trust the certificates of the operating system (schools often
// check encrypted traffic with their own certificate) and to follow the proxy settings of the computer.
// Older Node versions ignore these two switches.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const tsx = createRequire(import.meta.url).resolve("tsx/cli");
const child = spawn(process.execPath, [tsx, "src/server/index.ts"], {
  stdio: "inherit",
  env: { NODE_USE_SYSTEM_CA: "1", NODE_USE_ENV_PROXY: "1", ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --disable-warning=UNDICI-EHPA`.trim() },
});
const stop = () => child.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
