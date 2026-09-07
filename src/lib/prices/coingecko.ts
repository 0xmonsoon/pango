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
      if (typeof price === "number" && Number.isFinite(price) && price >= 0) {
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

// Historical USD price on a given date - used to derive cost basis for manual holdings.
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
  const price = data.market_data?.current_price?.usd;
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

export interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
}

export interface CoinMarket extends CoinSearchResult {
  current_price: number | null;
}

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  const data = await fetchJson<{ coins: CoinSearchResult[] }>(
    `${BASE}/search?query=${encodeURIComponent(query)}`, { headers: headers() },
  );
  return data.coins.slice(0, 20).map(({ id, symbol, name }) => ({ id, symbol, name }));
}

const marketCache = new Map<string, { coin: CoinMarket; at: number }>();

const slugCache = new Map<string, { id: string; at: number }>();

export async function resolveCoinSlug(slug: string): Promise<{ coin?: CoinMarket; candidates: CoinSearchResult[] }> {
  const cached = slugCache.get(slug);
  const id = cached && Date.now() - cached.at < 3_600_000 ? cached.id : slug;
  const direct = (await getCoinMarkets([id])).get(id);
  if (direct) return { coin: direct, candidates: [] };

  // Search the page's name, then verify web_slug. A ticker/name match alone
  // must never select a different asset with a similar name.
  let candidates = await searchCoins(slug);
  if (!candidates.length && slug.includes("-")) candidates = await searchCoins(slug.replaceAll("-", " "));
  const normalizedName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  candidates.sort((a, b) => Number(normalizedName(b.name) === slug) - Number(normalizedName(a.name) === slug));
  for (const candidate of candidates) {
    let detail: { id: string; web_slug?: string };
    try {
      detail = await fetchJson(`${BASE}/coins/${encodeURIComponent(candidate.id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`, { headers: headers() });
    } catch {
      // Let the user select a search result if the metadata service is limited.
      return { candidates };
    }
    if (detail.web_slug?.toLowerCase() === slug) {
      slugCache.set(slug, { id: detail.id, at: Date.now() });
      const coin = (await getCoinMarkets([detail.id])).get(detail.id);
      return { coin, candidates };
    }
  }
  return { candidates };
}

export async function getCoinMarkets(ids: string[], force = false): Promise<Map<string, CoinMarket>> {
  const result = new Map<string, CoinMarket>();
  const missing: string[] = [];
  for (const id of new Set(ids)) {
    const hit = marketCache.get(id);
    if (!force && hit && Date.now() - hit.at < PRICE_TTL_MS) result.set(id, hit.coin);
    else missing.push(id);
  }
  for (let i = 0; i < missing.length; i += 100) {
    const query = new URLSearchParams({ vs_currency: "usd", ids: missing.slice(i, i + 100).join(","), per_page: "100" });
    const coins = await fetchJson<CoinMarket[]>(`${BASE}/coins/markets?${query}`, { headers: headers() });
    for (const coin of coins) {
      const price = coin.current_price;
      const normalized = { id: coin.id, name: coin.name, symbol: coin.symbol,
        current_price: typeof price === "number" && Number.isFinite(price) && price >= 0 ? price : null };
      marketCache.set(coin.id, { coin: normalized, at: Date.now() });
      result.set(coin.id, normalized);
    }
  }
  return result;
}
