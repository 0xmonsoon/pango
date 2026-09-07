// Deterministic checks without API keys or database writes.
// Run: bun scripts/test-manual-holdings.ts
import assert from "node:assert/strict";
import { parsePurchase, purchaseQuantity, getManualHoldings } from "@/lib/manual-holdings";
import { getCoinMarkets, getHistoricalPrice, searchCoins } from "@/lib/prices/coingecko";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ coinId: "bitcoin", mode: "quantity", basis: "price", amount: "2.5", buyPrice: "100", ...overrides })) data.set(key, value);
  return data;
}

for (const mode of ["quantity", "spent"]) {
  for (const basis of ["price", "date"]) {
    const purchase = parsePurchase(form({ mode, basis, buyDate: "2026-01-01" }), "2026-09-07");
    assert.equal(purchaseQuantity(purchase.mode, purchase.amount, purchase.buyPrice ?? 100), mode === "quantity" ? 2.5 : 0.025);
    assert.equal(purchase.buyDate, basis === "date" ? "2026-01-01" : null);
  }
}
for (const amount of ["", "0", "-1", "NaN", "Infinity", "1e309"]) assert.throws(() => parsePurchase(form({ amount })));
for (const buyPrice of ["", "0", "-1", "NaN", "Infinity"]) assert.throws(() => parsePurchase(form({ buyPrice })));
for (const buyDate of ["2026-02-30", "2026-09-08", "invalid", "2026-1-01"]) assert.throws(() => parsePurchase(form({ basis: "date", buyDate }), "2026-09-07"));
assert.throws(() => parsePurchase(form({ mode: "unknown" })));
assert.throws(() => parsePurchase(form({ basis: "unknown" })));
assert.throws(() => parsePurchase(form({ coinId: "bitcoin,ethereum" })));
assert.throws(() => purchaseQuantity("spent", 1e308, 1e-308));
assert.throws(() => purchaseQuantity("quantity", 1e308, 100));

const originalFetch = globalThis.fetch;
let calls = 0;
let unavailable = false;
globalThis.fetch = (async (input: string | URL | Request) => {
  calls++;
  const url = new URL(String(input));
  if (unavailable) return new Response("", { status: 429 });
  if (url.pathname.endsWith("/history")) {
    assert.equal(url.searchParams.get("date"), "02-01-2026");
    return Response.json({ market_data: { current_price: { usd: 50 } } });
  }
  if (url.pathname.endsWith("/search")) {
    assert.equal(url.searchParams.get("query"), "test & coin");
    return Response.json({ coins: [{ id: "test-coin", name: "Test coin", symbol: "TEST" }] });
  }
  return Response.json([{ id: "test-coin", name: "Test coin", symbol: "test", current_price: 80 }]);
}) as typeof fetch;

try {
  assert.equal((await searchCoins("test & coin"))[0].id, "test-coin");
  assert.equal(await getHistoricalPrice("test-coin", new Date("2026-01-02T00:00:00Z")), 50);
  assert.equal((await getCoinMarkets(["test-coin"])).get("test-coin")?.current_price, 80);
  const before = calls;
  await getCoinMarkets(["test-coin", "test-coin"]);
  assert.equal(calls, before, "fresh market prices should be cached");
  await getCoinMarkets(["test-coin"], true);
  assert.equal(calls, before + 1, "forced refresh must bypass cache");

  const client = {
    from(table: string) {
      if (table === "price_cache") return { select() { return { async in() { return { data: [], error: null }; } }; } };
      assert.equal(table, "manual_holdings");
      return { select() { return { eq(column: string, value: string) {
        assert.equal(column, "user_id"); assert.equal(value, "owner");
        return { async order() { return { data: [
          { id: "1", coingecko_id: "test-coin", symbol: "TEST", quantity: "2", cost_basis_price: "50", cost_basis_date: null, note: "test purchase" },
          { id: "2", coingecko_id: "missing-coin", symbol: "MISSING", quantity: "1", cost_basis_price: null, cost_basis_date: null, note: null },
        ], error: null }; } };
      } }; } };
    },
  } as unknown as Parameters<typeof getManualHoldings>[0];
  const holdings = await getManualHoldings(client, "owner", false, null);
  assert.equal(holdings.rows[0].usdValue, 160);
  assert.equal(holdings.rows[0].costUsd, 100);
  assert.equal(holdings.rows[0].gainUsd, 60);
  assert.equal(holdings.rows[1].usdValue, null);
  assert.equal(holdings.rows[1].gainUsd, null);
  assert.ok(holdings.warnings.some((warning) => warning.includes("excluded")));
  unavailable = true;
  const failed = await getManualHoldings(client, "owner", true, null);
  assert.equal(failed.rows.length, 2, "holdings must stay visible during an outage");
  assert.equal(failed.rows[0].usdValue, 160, "keep last good value during outages");
  assert.equal(failed.rows[0].priceStale, true);
  assert.equal(failed.rows[1].usdValue, null, "unknown price must not look like zero");
  assert.match(failed.warnings[0], /refresh failed/);
  console.log("Manual holdings checks passed: four purchase modes, validation, pricing, caching, ownership filter, and outages.");
} finally {
  globalThis.fetch = originalFetch;
}
