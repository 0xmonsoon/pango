import { fetchJson } from "@/lib/http";

// CoinGecko prices. Works without a key on the public endpoint; a free "demo"
// key (x-cg-demo-api-key) raises rate limits. Used for BTC/ZEC and manual holdings.
const BASE = "https://api.coingecko.com/api/v3";
const KEY = process.env.COINGECKO_API_KEY;
const PRICE_TTL_MS = 60_000;

function headers(): Record<string, string> | undefined {
  return KEY ? { "x-cg-demo-api-key": KEY } : undefined;
}

const priceCache = new Map<string, { price: number; at: number }>();

// Current USD price for one or more CoinGecko ids (e.g. "bitcoin", "zcash").
export async function getPrices(
  ids: string[],
): Promise<Record<string, number>> {
  const now = Date.now();
  const out: Record<string, number> = {};
  const missing: string[] = [];

  for (const id of ids) {
    const hit = priceCache.get(id);
    if (hit && now - hit.at < PRICE_TTL_MS) out[id] = hit.price;
    else missing.push(id);
  }

  if (missing.length > 0) {
    const url = `${BASE}/simple/price?ids=${encodeURIComponent(
      missing.join(","),
    )}&vs_currencies=usd`;
    const data = await fetchJson<Record<string, { usd?: number }>>(url, {
      headers: headers(),
    });
    for (const id of missing) {
      const price = data[id]?.usd;
      if (typeof price === "number") {
        priceCache.set(id, { price, at: now });
        out[id] = price;
      }
    }
  }

  return out;
}

export async function getPrice(id: string): Promise<number | null> {
  return (await getPrices([id]))[id] ?? null;
}

// Historical USD price on a given date — used to derive cost basis for manual holdings.
export async function getHistoricalPrice(
  id: string,
  date: Date,
): Promise<number | null> {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const url = `${BASE}/coins/${encodeURIComponent(
    id,
  )}/history?date=${dd}-${mm}-${yyyy}&localization=false`;
  const data = await fetchJson<{
    market_data?: { current_price?: { usd?: number } };
  }>(url, { headers: headers() });
  return data.market_data?.current_price?.usd ?? null;
}
