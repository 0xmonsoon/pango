import { fetchJson } from "@/lib/http";
import { getPrice } from "@/lib/prices/coingecko";
import type { AdapterResult, ChainAdapter, HoldingRow } from "./types";

// Zcash transparent balances via Blockchair.
// We pass `limit=0` to drop the (unused) transaction list: the default request
// pulls thousands of tx refs and reliably trips Blockchair's anonymous IP
// rate-limit (HTTP 430), while the balance-only request is light enough to serve
// keyless. BLOCKCHAIR_API_KEY still raises limits. Shielded (z-addr) funds are
// not visible on-chain and are out of scope.
const BASE = "https://api.blockchair.com/zcash/dashboards/address";
const KEY = process.env.BLOCKCHAIR_API_KEY;

interface BlockchairResponse {
  data?: Record<string, { address?: { balance?: number } }> | null;
  context?: { market_price_usd?: number };
}

export const zcashAdapter: ChainAdapter = {
  chain: "zcash",
  configured: true,
  async getHoldings(address: string): Promise<AdapterResult> {
    const params = KEY ? `?limit=0&key=${KEY}` : `?limit=0`;

    let data: BlockchairResponse;
    try {
      data = await fetchJson<BlockchairResponse>(`${BASE}/${address}${params}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        rows: [],
        totalUsd: 0,
        failed: true,
        warnings: [
          msg.includes("430")
            ? "Zcash rate-limited by Blockchair — set BLOCKCHAIR_API_KEY for reliable lookups."
            : `Zcash lookup failed: ${msg}`,
        ],
      };
    }

    // A null `data` is Blockchair's shape for a throttled/blacklisted response.
    const entry = data.data?.[address];
    if (!entry) {
      return {
        rows: [],
        totalUsd: 0,
        failed: true,
        warnings: [
          "Zcash balance unavailable from Blockchair (likely rate-limited — set BLOCKCHAIR_API_KEY).",
        ],
      };
    }

    const zatoshi = entry.address?.balance ?? 0;
    const amount = zatoshi / 1e8; // zatoshi -> ZEC

    if (amount <= 0) return { rows: [], totalUsd: 0, warnings: [] };

    // Prefer CoinGecko; fall back to Blockchair's bundled market price.
    const price =
      (await getPrice("zcash")) ?? data.context?.market_price_usd ?? null;
    const usdValue = price ? amount * price : 0;

    const rows: HoldingRow[] = [
      {
        kind: "token",
        chain: "zcash",
        symbol: "ZEC",
        name: "Zcash",
        amount,
        priceUsd: price,
        usdValue,
      },
    ];

    return {
      rows,
      totalUsd: usdValue,
      warnings: price ? [] : ["No ZEC price available from CoinGecko."],
    };
  },
};
