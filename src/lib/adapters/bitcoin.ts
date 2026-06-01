import { fetchJson } from "@/lib/http";
import { getPrice } from "@/lib/prices/coingecko";
import type { AdapterResult, ChainAdapter, HoldingRow } from "./types";

// Bitcoin balances via Blockstream's Esplora API (free, no key).
const BASE = "https://blockstream.info/api";

interface EsploraAddress {
  chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
  mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
}

export const bitcoinAdapter: ChainAdapter = {
  chain: "bitcoin",
  configured: true,
  async getHoldings(address: string): Promise<AdapterResult> {
    const data = await fetchJson<EsploraAddress>(`${BASE}/address/${address}`);

    const confirmed =
      (data.chain_stats?.funded_txo_sum ?? 0) -
      (data.chain_stats?.spent_txo_sum ?? 0);
    const pending =
      (data.mempool_stats?.funded_txo_sum ?? 0) -
      (data.mempool_stats?.spent_txo_sum ?? 0);
    const amount = (confirmed + pending) / 1e8; // sats -> BTC

    if (amount <= 0) return { rows: [], totalUsd: 0, warnings: [] };

    const price = await getPrice("bitcoin");
    const usdValue = price ? amount * price : 0;

    const rows: HoldingRow[] = [
      {
        kind: "token",
        chain: "bitcoin",
        symbol: "BTC",
        name: "Bitcoin",
        amount,
        priceUsd: price,
        usdValue,
      },
    ];

    return {
      rows,
      totalUsd: usdValue,
      warnings: price ? [] : ["No BTC price available from CoinGecko."],
    };
  },
};
