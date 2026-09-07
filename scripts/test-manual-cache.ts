// Run: bun scripts/test-manual-cache.ts — no real network or database writes.
import assert from "node:assert/strict";
import { getManualPrices } from "@/lib/prices/manual-cache";

const originalFetch = globalThis.fetch;
let calls = 0;
let fail = false;
let noPrice = false;
let writeError = false;
const saved: { asset_key: string; price_usd: number; fetched_at: string }[] = [];
let dbRows: typeof saved = [];
const client = {
  from(table: string) {
    assert.equal(table, "price_cache");
    return { select() { return { async in(column: string, keys: string[]) {
      assert.equal(column, "asset_key");
      return { data: dbRows.filter((row) => keys.includes(row.asset_key)), error: null };
    } }; } };
  },
} as unknown as Parameters<typeof getManualPrices>[0];
const admin = {
  from(table: string) {
    assert.equal(table, "price_cache");
    return { async upsert(rows: typeof saved) {
      if (writeError) return { error: { message: "write failed" } };
      saved.push(...rows);
      return { error: null };
    } };
  },
} as unknown as NonNullable<Parameters<typeof getManualPrices>[3]>;
globalThis.fetch = (async (input: string | URL | Request) => {
  calls++;
  if (fail) return new Response("", { status: 429 });
  const ids = new URL(String(input)).searchParams.get("ids")!.split(",");
  return Response.json(ids.map((id) => ({ id, name: "Cache test", symbol: "TEST", current_price: noPrice ? null : 80 })));
}) as typeof fetch;
try {
  const oldTime = new Date(Date.now() - 10 * 60_000).toISOString();
  const freshTime = new Date().toISOString();
  dbRows = [
    { asset_key: "coingecko:fresh", price_usd: 50, fetched_at: freshTime },
    { asset_key: "coingecko:expired", price_usd: 40, fetched_at: oldTime },
    { asset_key: "coingecko:outage", price_usd: 30, fetched_at: oldTime },
  ];
  const fresh = await getManualPrices(client, ["fresh"], false, admin);
  assert.equal(calls, 0, "fresh persisted prices survive an empty process cache without an API call");
  assert.equal(fresh.prices.get("fresh")?.coin.current_price, 50);
  const expired = await getManualPrices(client, ["expired"], false, admin);
  assert.equal(calls, 1);
  assert.equal(expired.prices.get("expired")?.coin.current_price, 80);
  assert.equal(saved[0].asset_key, "coingecko:expired");
  await getManualPrices(client, ["expired"], false, admin);
  assert.equal(calls, 1, "a fresh in-memory price is reused");
  await getManualPrices(client, ["fresh"], true, admin);
  assert.equal(calls, 2, "force bypasses persisted and in-memory prices");
  const writesBeforeFailure = saved.length;
  fail = true;
  const outage = await getManualPrices(client, ["outage", "uncached"], false, admin);
  assert.equal(outage.prices.get("outage")?.coin.current_price, 30);
  assert.equal(outage.prices.get("outage")?.fetchedAt, oldTime);
  assert.equal(outage.prices.get("outage")?.stale, true);
  assert.equal(outage.prices.has("uncached"), false);
  assert.equal(saved.length, writesBeforeFailure, "failed fetches never poison the database cache");
  fail = false; noPrice = true;
  const missing = await getManualPrices(client, ["outage"], true, admin);
  assert.equal(missing.prices.get("outage")?.coin.current_price, 30, "missing market price retains cached value");
  noPrice = false; writeError = true;
  const failedWrite = await getManualPrices(client, ["write-test"], true, admin);
  assert.equal(failedWrite.prices.get("write-test")?.coin.current_price, 80);
  assert.ok(failedWrite.warnings.some((w) => w.includes("could not be saved")));
  console.log("Manual price cache checks passed: persisted hits, expiry, force, stale fallback, missing prices, and write failure.");
} finally { globalThis.fetch = originalFetch; }
