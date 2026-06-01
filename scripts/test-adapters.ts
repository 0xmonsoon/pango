// Live smoke test for the no-key adapters. Run: bun scripts/test-adapters.ts
import { getHoldings } from "@/lib/adapters";
import { getPrices } from "@/lib/prices/coingecko";
import { aggregateWallets, formatUsd, type Wallet } from "@/lib/portfolio";
import type { ChainKind } from "@/lib/chains";

const cases: { chain: ChainKind; address: string; note: string }[] = [
  {
    chain: "bitcoin",
    address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    note: "Satoshi genesis address (always funded)",
  },
  {
    chain: "zcash",
    address: "t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd",
    note: "Founders' reward t3 address",
  },
];

console.log("=== CoinGecko prices ===");
try {
  console.log(await getPrices(["bitcoin", "zcash"]));
} catch (e) {
  console.log("price error:", (e as Error).message);
}

for (const c of cases) {
  console.log(`\n=== ${c.chain.toUpperCase()} (${c.note}) ===`);
  const res = await getHoldings(c.chain, c.address);
  console.log("totalUsd:", res.totalUsd.toFixed(2));
  console.log("warnings:", res.warnings);
  for (const r of res.rows) {
    console.log(
      `  ${r.symbol ?? r.name} ${r.kind}  amount=${r.amount} price=${r.priceUsd} usd=${r.usdValue.toFixed(2)}`,
    );
  }
}

console.log("\n=== AGGREGATOR (mixed wallet set) ===");
const wallets: Wallet[] = [
  { id: "w1", chain: "bitcoin", address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", label: "BTC genesis" },
  { id: "w2", chain: "evm", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label: "vitalik.eth" },
  { id: "w3", chain: "solana", address: "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9", label: "sol" },
];
const portfolio = await aggregateWallets(wallets);
console.log("net worth:", formatUsd(portfolio.netWorthUsd));
console.log("by chain:", portfolio.byChain.map((c) => `${c.chain}=${formatUsd(c.usd)}`).join(", "));
console.log("warnings:", portfolio.warnings);
console.log("rows:", portfolio.rows.length);
