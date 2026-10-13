/** Provider whose keys start with a fixed prefix. A key pasted into the wrong provider fails with an unclear error, so the setup page says it early. */
const PREFIXES: { prefix: string; provider: string; name: string }[] = [
  { prefix: "sk-or-", provider: "openrouter", name: "OpenRouter" },
  { prefix: "sk-ant-", provider: "anthropic", name: "Claude (Anthropic)" },
];

/** A plain-language hint when the key obviously belongs to another provider than the chosen one. Undefined when nothing is wrong. */
export function keyHint(providerId: string, key: string): string | undefined {
  const k = key.trim();
  const match = PREFIXES.find((p) => k.startsWith(p.prefix));
  if (!match || match.provider === providerId) return undefined;
  return `Dieser Schlüssel gehört zu ${match.name}. Wähle oben bei „Anbieter“ ${match.name}.`;
}
