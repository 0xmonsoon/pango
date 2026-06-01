import type { ChainKind } from "@/lib/chains";
import type { AdapterResult, ChainAdapter } from "./types";
import { bitcoinAdapter } from "./bitcoin";
import { zcashAdapter } from "./zcash";
import { zerionEvmAdapter, zerionSolanaAdapter } from "./zerion";

export const ADAPTERS: Record<ChainKind, ChainAdapter> = {
  evm: zerionEvmAdapter,
  solana: zerionSolanaAdapter,
  bitcoin: bitcoinAdapter,
  zcash: zcashAdapter,
};

export function getAdapter(chain: ChainKind): ChainAdapter {
  return ADAPTERS[chain];
}

// Never throws — upstream/network errors become a warning so one bad wallet
// can't break the whole portfolio aggregation.
export async function getHoldings(
  chain: ChainKind,
  address: string,
): Promise<AdapterResult> {
  try {
    return await ADAPTERS[chain].getHoldings(address);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      rows: [],
      totalUsd: 0,
      warnings: [`${chain} fetch failed: ${message}`],
      failed: true,
    };
  }
}

export type { AdapterResult, ChainAdapter, HoldingRow } from "./types";
