import type { ChainKind } from "@/lib/chains";

// A single normalized line item in a portfolio, always USD-valued.
export interface HoldingRow {
  kind: "token" | "defi";
  chain: ChainKind;
  symbol: string | null;
  name: string | null;
  protocol?: string | null;
  amount: number | null;
  priceUsd: number | null;
  usdValue: number;
}

export interface AdapterResult {
  rows: HoldingRow[];
  totalUsd: number;
  // Soft, non-fatal issues to surface in the UI (e.g. "not configured", rate limits).
  warnings: string[];
  // True when the fetch genuinely failed (network/rate-limit), as opposed to the
  // wallet simply being empty. The aggregator uses this to avoid caching a zero
  // and to fall back to the last good snapshot instead of showing $0.
  failed?: boolean;
}

export interface ChainAdapter {
  chain: ChainKind;
  // false when the source needs a key that isn't set yet.
  configured: boolean;
  getHoldings(address: string): Promise<AdapterResult>;
}

export function emptyResult(...warnings: string[]): AdapterResult {
  return { rows: [], totalUsd: 0, warnings };
}

export function sumRows(rows: HoldingRow[]): number {
  return rows.reduce((acc, r) => acc + (Number.isFinite(r.usdValue) ? r.usdValue : 0), 0);
}
