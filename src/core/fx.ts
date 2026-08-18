const BASE = "https://api.frankfurter.dev/v1/latest";
const TTL_MS = 60 * 60 * 1000; // 1h — FX doesn't move fast enough to need less

let cache: { fetchedAt: number; rates: Record<string, number> } | null = null;

/** Pure parser — kept separate from the fetch so it's unit-testable without network. */
export function parseFxResponse(raw: unknown): Record<string, number> {
  const r = raw as { rates?: Record<string, number> } | undefined;
  if (!r?.rates || Object.keys(r.rates).length === 0) {
    throw new Error("Frankfurter response had no rates");
  }
  return r.rates;
}

/**
 * USD -> {symbols} conversion rates, via the keyless Frankfurter API
 * (api.frankfurter.dev). USDC is treated 1:1 with USD for display purposes.
 * In-memory cached 1h — this data never needs to be persisted to disk.
 */
export async function fetchUsdRates(symbols: string[]): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    const have = symbols.every((s) => s in cache!.rates);
    if (have) return cache.rates;
  }

  const res = await fetch(`${BASE}?base=USD&symbols=${symbols.join(",")}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Frankfurter ${res.status} ${res.statusText}`);
  const rates = parseFxResponse(await res.json());
  cache = { fetchedAt: Date.now(), rates: { ...(cache?.rates ?? {}), ...rates } };
  return cache.rates;
}
