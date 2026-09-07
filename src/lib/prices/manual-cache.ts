import { getCoinMarkets, type CoinMarket } from "@/lib/prices/coingecko";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

const TTL_MS = 5 * 60_000;
const PREFIX = "coingecko:";
type CachedPrice = { coin: CoinMarket; fetchedAt: string; stale: boolean };
const memory = new Map<string, CachedPrice>();

export async function getManualPrices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
  force = false,
  admin = hasAdminClient ? createAdminClient() : null,
) {
  const unique = [...new Set(ids)];
  const prices = new Map<string, CachedPrice>();
  const warnings: string[] = [];
  if (!unique.length) return { prices, warnings };
  const now = Date.now();
  for (const id of unique) {
    const cached = memory.get(id);
    if (cached) prices.set(id, { ...cached });
  }
  const { data, error } = await supabase.from("price_cache")
    .select("asset_key, price_usd, fetched_at").in("asset_key", unique.map((id) => PREFIX + id));
  if (error) warnings.push("Saved token prices could not be loaded; using live or in-memory prices.");
  for (const row of data ?? []) {
    const id = String(row.asset_key).slice(PREFIX.length);
    const price = Number(row.price_usd);
    const at = Date.parse(row.fetched_at);
    const previous = prices.get(id);
    if (Number.isFinite(price) && price >= 0 && Number.isFinite(at) && (!previous || at > Date.parse(previous.fetchedAt))) {
      prices.set(id, {
        coin: { id, name: previous?.coin.name ?? id, symbol: previous?.coin.symbol ?? "", current_price: price },
        fetchedAt: new Date(at).toISOString(), stale: false,
      });
    }
  }
  const missing = unique.filter((id) => force || !prices.has(id) || now - Date.parse(prices.get(id)!.fetchedAt) >= TTL_MS);
  if (missing.length) {
    let live = new Map<string, CoinMarket>();
    try { live = await getCoinMarkets(missing, true); }
    catch { warnings.push("CoinGecko refresh failed. Showing last cached token prices where available."); }
    const writes: { asset_key: string; price_usd: number; fetched_at: string }[] = [];
    for (const id of missing) {
      const coin = live.get(id);
      if (coin && coin.current_price !== null) {
        const fetchedAt = new Date().toISOString();
        prices.set(id, { coin, fetchedAt, stale: false });
        writes.push({ asset_key: PREFIX + id, price_usd: coin.current_price, fetched_at: fetchedAt });
      } else {
        const cached = prices.get(id);
        if (cached) prices.set(id, { ...cached, stale: true });
      }
    }
    if (admin && writes.length) {
      const { error: writeError } = await admin.from("price_cache").upsert(writes, { onConflict: "asset_key" });
      if (writeError) warnings.push("Token prices refreshed, but could not be saved to the cache.");
    }
  }
  for (const [id, price] of prices) memory.set(id, price);
  if (!admin) warnings.push("Persistent token price cache disabled (set SUPABASE_SERVICE_ROLE_KEY); prices are cached in memory.");
  if (unique.some((id) => prices.get(id)?.stale)) warnings.push("Some token values use older cached prices; see the price timestamp on each holding.");
  if (unique.some((id) => !prices.has(id))) warnings.push("Some manual tokens have no available price and are excluded from net worth.");
  return { prices, warnings };
}
