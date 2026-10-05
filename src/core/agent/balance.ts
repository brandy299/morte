export interface Balance {
  /** e.g. "4,20 CNY", ready to show. */
  text: string;
}

/**
 * Remaining credit, only where the provider offers a plain query with a normal key.
 * Anthropic and OpenAI do not (admin access needed), so they return undefined.
 */
export async function fetchBalance(provider: string, apiKey: string | undefined, fetchFn: typeof fetch = fetch): Promise<Balance | undefined> {
  if (!apiKey) return undefined;
  if (provider === "openrouter") return openrouterBalance(apiKey, fetchFn);
  if (provider !== "deepseek") return undefined;
  try {
    const res = await fetchFn("https://api.deepseek.com/user/balance", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { balance_infos?: { currency: string; total_balance: string }[] };
    const info = body.balance_infos?.[0];
    if (!info) return undefined;
    const amount = Number(info.total_balance);
    if (!Number.isFinite(amount)) return undefined;
    return { text: `${amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${info.currency}` };
  } catch {
    return undefined;
  }
}

/** OpenRouter shows what is left of the key's limit; a key without a limit has no remaining amount to show. */
async function openrouterBalance(apiKey: string, fetchFn: typeof fetch): Promise<Balance | undefined> {
  try {
    const res = await fetchFn("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;
    const left = ((await res.json()) as { data?: { limit_remaining?: number | null } }).data?.limit_remaining;
    if (typeof left !== "number" || !Number.isFinite(left)) return undefined;
    return { text: `${left.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` };
  } catch {
    return undefined;
  }
}
