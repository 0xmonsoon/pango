import { chainLabel, type ChainKind } from "@/lib/chains";
import { getHoldings } from "@/lib/adapters";
import type { HoldingRow } from "@/lib/adapters";

export interface Wallet {
  id: string;
  chain: ChainKind;
  address: string;
  label: string | null;
}

export interface PortfolioRow extends HoldingRow {
  walletId: string;
  walletLabel: string | null;
}

export interface ChainTotal {
  chain: ChainKind;
  usd: number;
}

// One wallet's slice of the portfolio: its total value plus its own asset rows.
export interface WalletBreakdown {
  walletId: string;
  walletLabel: string | null;
  chain: ChainKind;
  address: string;
  totalUsd: number;
  rows: PortfolioRow[];
  warnings: string[];
}

export interface Portfolio {
  netWorthUsd: number;
  byChain: ChainTotal[];
  byWallet: WalletBreakdown[];
  rows: PortfolioRow[];
  warnings: string[];
  walletCount: number;
}

export function emptyPortfolio(walletCount = 0): Portfolio {
  return {
    netWorthUsd: 0,
    byChain: [],
    byWallet: [],
    rows: [],
    warnings: [],
    walletCount,
  };
}

// Per-wallet input: the holdings already fetched (live or from cache) for a wallet.
export interface WalletHoldings {
  wallet: Wallet;
  rows: HoldingRow[];
  warnings: string[];
}

// Combine per-wallet results into a single portfolio view.
export function combinePortfolio(parts: WalletHoldings[]): Portfolio {
  const warnings: string[] = [];

  // One breakdown per wallet (rows attributed + sorted, total computed).
  const byWallet: WalletBreakdown[] = parts.map(
    ({ wallet, rows: wRows, warnings: wWarnings }) => {
      const rows = wRows
        .map((r) => ({ ...r, walletId: wallet.id, walletLabel: wallet.label }))
        .sort((a, b) => b.usdValue - a.usdValue);
      for (const warn of wWarnings) {
        warnings.push(`${chainLabel(wallet.chain)}: ${warn}`);
      }
      return {
        walletId: wallet.id,
        walletLabel: wallet.label,
        chain: wallet.chain,
        address: wallet.address,
        rows,
        totalUsd: rows.reduce((acc, r) => acc + r.usdValue, 0),
        warnings: wWarnings,
      };
    },
  );
  byWallet.sort((a, b) => b.totalUsd - a.totalUsd);

  // Flat + per-chain views derive from the per-wallet rows.
  const rows = byWallet.flatMap((w) => w.rows).sort((a, b) => b.usdValue - a.usdValue);
  const byChainMap = new Map<ChainKind, number>();
  for (const r of rows) {
    byChainMap.set(r.chain, (byChainMap.get(r.chain) ?? 0) + r.usdValue);
  }
  const byChain = [...byChainMap.entries()]
    .map(([chain, usd]) => ({ chain, usd }))
    .sort((a, b) => b.usd - a.usd);
  const netWorthUsd = rows.reduce((acc, r) => acc + r.usdValue, 0);

  return {
    netWorthUsd,
    byChain,
    byWallet,
    rows,
    warnings: [...new Set(warnings)],
    walletCount: parts.length,
  };
}

// Live aggregation with no caching — used by tests and as a fallback path.
export async function aggregateWallets(wallets: Wallet[]): Promise<Portfolio> {
  if (wallets.length === 0) return emptyPortfolio(0);
  const parts = await Promise.all(
    wallets.map(async (wallet) => {
      const res = await getHoldings(wallet.chain, wallet.address);
      return { wallet, rows: res.rows, warnings: res.warnings };
    }),
  );
  return combinePortfolio(parts);
}

// Re-exported for existing server-side imports; canonical home is @/lib/format.
export { formatUsd } from "./format";
