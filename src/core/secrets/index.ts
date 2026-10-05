import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../paths.ts";

export interface SecretStore {
  readonly kind: "keychain" | "file";
  get(name: string): Promise<string | undefined>;
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
}

const SERVICE = "morte";

async function keychainStore(): Promise<SecretStore | undefined> {
  try {
    const { AsyncEntry } = await import("@napi-rs/keyring");
    // Probe: some systems (containers, headless Linux) have no keychain.
    const probe = new AsyncEntry(SERVICE, "probe");
    await probe.setPassword("ok");
    await probe.deletePassword();
    return {
      kind: "keychain",
      get: async (name) => (await new AsyncEntry(SERVICE, name).getPassword()) ?? undefined,
      set: (name, value) => new AsyncEntry(SERVICE, name).setPassword(value),
      delete: async (name) => {
        await new AsyncEntry(SERVICE, name).deletePassword();
      },
    };
  } catch {
    return undefined;
  }
}

/** Fallback: a file in the user's data folder, readable by the owner only. Not encrypted. */
function fileStore(file = join(dataDir(), "Einstellungen", ".zugang.json")): SecretStore {
  const load = async (): Promise<Record<string, string>> => {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch {
      return {};
    }
  };
  const save = async (data: Record<string, string>) => {
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, JSON.stringify(data), { mode: 0o600 });
    await chmod(file, 0o600);
  };
  return {
    kind: "file",
    get: async (name) => (await load())[name],
    set: async (name, value) => save({ ...(await load()), [name]: value }),
    delete: async (name) => {
      const { [name]: _removed, ...rest } = await load();
      await save(rest);
    },
  };
}

export async function createSecretStore(): Promise<SecretStore> {
  return (await keychainStore()) ?? fileStore();
}

export { fileStore as createFileSecretStore };
