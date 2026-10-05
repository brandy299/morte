import type { ChatSession, createCompleter } from "../core/agent/index.ts";
import type { StoredMessage } from "../core/history/index.ts";
import type { SecretStore } from "../core/secrets/index.ts";

/** Holds the current chat session; it is rebuilt after the setup changes provider, model or key. */
export interface AppState {
  secrets: SecretStore;
  session: ChatSession | undefined;
  configured: { provider: string; model: string } | undefined;
  /** Last choice, so "Neues Gespräch" can rebuild the session and pick up new skills. */
  choice?: { provider: string; model?: string };
  /** The conversation on screen. Saved after every answer, so it can be reopened later. */
  /** For tests: builds the one-off model access used outside the chat. */
  makeCompleter?: typeof createCompleter;
  conversation?: { id: string; titel: string; anzeige: StoredMessage[] };
}

export const keyName = (provider: string) => `apikey:${provider}`;

/** The stored API key of a provider, if there is one. */
export const loadSecret = (state: AppState, provider: string) => state.secrets.get(keyName(provider));
