export interface Balance {
  /** e.g. "4,20 CNY", ready to show. */
  text: string;
}

/**
 * Remaining credit, only where the provider offers a plain query with a normal key.
 * Anthropic and OpenAI do not (admin access needed), so they return undefined.
 */
export async function fetchBalance(provider: string, apiKey: string | undefined, fetchFn: typeof fetch = fetch): Promise<Balance | undefined> {
  if (provider !== "deepseek" || !apiKey) return undefined;
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
