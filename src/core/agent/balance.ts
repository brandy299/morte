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

/**
 * OpenRouter: the credit of the whole account (bought minus used) and the limit of this key are different things.
 * What is really left is the smaller of the two, so that is what we show.
 */
async function openrouterBalance(apiKey: string, fetchFn: typeof fetch): Promise<Balance | undefined> {
  const get = async (path: string) => {
    try {
      const res = await fetchFn(`https://openrouter.ai/api/v1/${path}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok ? ((await res.json()) as { data?: Record<string, unknown> }).data : undefined;
    } catch {
      return undefined;
    }
  };
  const [key, credits] = await Promise.all([get("auth/key"), get("credits")]);
  const amounts: number[] = [];
  if (typeof key?.limit_remaining === "number") amounts.push(key.limit_remaining);
  if (typeof credits?.total_credits === "number" && typeof credits.total_usage === "number") amounts.push(credits.total_credits - credits.total_usage);
  const left = amounts.filter(Number.isFinite);
  if (left.length === 0) return undefined;
  return { text: `${Math.max(0, Math.min(...left)).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` };
}
