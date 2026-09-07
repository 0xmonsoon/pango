// Run: bun scripts/test-coingecko-links.ts
import assert from "node:assert/strict";
import { coinSlugFromUrl } from "@/lib/coingecko-links";
import { resolveCoinSlug } from "@/lib/prices/coingecko";

const firoLink = "https://www.coingecko.com/en/coins/firo?chart=type%3Dmarket_cap%26mode%3Dline%26timeframe%3Dd365";
for (const url of [firoLink, "coingecko.com/en/coins/firo", "//www.coingecko.com/en/coins/firo", "http://coingecko.com/coins/firo/", "https://www.coingecko.com/zh-tw/coins/firo#markets", "https://coingecko.com/de/coins/%66iro/historical_data?start=1", "https://coingecko.com/en/coins/firo/markets"]) assert.equal(coinSlugFromUrl(url), "firo");
for (const url of ["https://evil.com/en/coins/firo", "https://coingecko.com.evil.com/en/coins/firo", "https://evil.com@coingecko.com/en/coins/firo", "ftp://coingecko.com/en/coins/firo", "https://coingecko.com/en", "https://coingecko.com/en/coins/%ZZ", "https://coingecko.com/en/coins/firo%2Fevil", "https://coingecko.com/en/coins/firo/../../api"]) assert.throws(() => coinSlugFromUrl(url));
assert.equal(coinSlugFromUrl("Firo"), null);
assert.equal(coinSlugFromUrl("BTC"), null);

const originalFetch = globalThis.fetch;
let detailCalls = 0;
const assets = [
  { id: "bitcoin", web_slug: "bitcoin", name: "Bitcoin", symbol: "btc", current_price: 100 },
  { id: "zcoin", web_slug: "firo", name: "Firo", symbol: "firo", current_price: 1 },
  { id: "usd-coin", web_slug: "usdc", name: "USDC", symbol: "usdc", current_price: 1 },
  { id: "old-name", web_slug: "new-name", name: "New Name", symbol: "new", current_price: 2 },
];
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(String(input));
  assert.equal(url.hostname, "api.coingecko.com");
  if (url.pathname.endsWith("/markets")) return Response.json(assets.filter((a) => a.id === url.searchParams.get("ids")));
  if (url.pathname.endsWith("/search")) {
    const q = url.searchParams.get("query");
    return Response.json({ coins: q === "misleading" ? [assets[1]] : assets.filter((a) => a.name.toLowerCase() === q) });
  }
  detailCalls++;
  const asset = assets.find((a) => url.pathname.endsWith(`/${a.id}`));
  return asset ? Response.json(asset) : new Response("", { status: 404 });
}) as typeof fetch;
try {
  assert.equal((await resolveCoinSlug(coinSlugFromUrl(firoLink)!)).coin?.id, "zcoin");
  const before = detailCalls;
  assert.equal((await resolveCoinSlug("firo")).coin?.id, "zcoin");
  assert.equal(detailCalls, before, "resolved aliases should be cached");
  assert.equal((await resolveCoinSlug("bitcoin")).coin?.id, "bitcoin");
  assert.equal((await resolveCoinSlug("usdc")).coin?.id, "usd-coin");
  assert.equal((await resolveCoinSlug("new-name")).coin?.id, "old-name");
  const mismatch = await resolveCoinSlug("misleading");
  assert.equal(mismatch.coin, undefined, "never select an unverified similar token");
  assert.equal(mismatch.candidates.length, 1);
  assert.equal((await resolveCoinSlug("unknown")).coin, undefined);
  console.log("CoinGecko link checks passed: URL variants, renamed assets, caching, and ambiguous matches.");
} finally { globalThis.fetch = originalFetch; }
