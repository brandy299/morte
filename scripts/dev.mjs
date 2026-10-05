// Starts the Node server and the Vite dev server together.
import { spawn } from "node:child_process";

const run = (cmd, args) => spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
const children = [run("npx", ["tsx", "watch", "src/server/index.ts"]), run("npx", ["vite"])];
const stop = () => children.forEach((c) => c.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((c) => c.on("exit", stop));
