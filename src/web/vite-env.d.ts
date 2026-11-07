/// <reference types="vite/client" />

/** Set at build time in vite.config.ts. */
declare const __PULT_VERSION__: string;
declare const __PULT_COMMIT__: string;

/** Only there when Pult runs as the desktop app (see electron/preload.cjs). */
interface Window {
  pultApp?: { ordnerWaehlen: () => Promise<string | null>; mikrofonEinstellungen: () => Promise<void> };
}
