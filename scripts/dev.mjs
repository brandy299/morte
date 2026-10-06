// Starts the Node server and the Vite dev server together.
import { spawn } from "node:child_process";

const run = (cmd, args, env = {}) => spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
const children = [run("npx", ["tsx", "watch", "src/server/index.ts"], { PULT_DEV_PORT: "5173", NODE_USE_SYSTEM_CA: "1", NODE_USE_ENV_PROXY: "1", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --disable-warning=UNDICI-EHPA`.trim() }), run("npx", ["vite"])];
const stop = () => children.forEach((c) => c.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((c) => c.on("exit", stop));
