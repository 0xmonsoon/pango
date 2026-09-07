import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getUserPortfolio,
  type PortfolioView,
} from "@/lib/portfolio-service";
import { chainLabel, chainShortLabel, type ChainKind } from "@/lib/chains";
import { formatUsd, walletName } from "@/lib/format";
import { refreshPortfolio } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { ManualHoldingsList } from "@/components/manual-holdings-list";

const CHAIN_COLOR: Record<ChainKind, string> = {
  evm: "bg-emerald-500",
  solana: "bg-violet-500",
  bitcoin: "bg-amber-500",
  zcash: "bg-yellow-400",
};

const CHAIN_BADGE: Record<ChainKind, string> = {
  evm: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  solana: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  bitcoin: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  zcash: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

export default async function DashboardPage() {
  const portfolio: PortfolioView | null = isSupabaseConfigured
    ? await getUserPortfolio()
    : null;

  // Not connected to Supabase yet — show the shell with guidance.
  if (!portfolio) {
    return (
      <NetWorthCard value={0} subtitle="Connect Supabase and add wallets to see your net worth." />
    );
  }

  if (portfolio.walletCount === 0 && portfolio.manualHoldings.length === 0 && portfolio.warnings.length === 0) {
    return (
      <>
        <NetWorthCard value={0} subtitle="No wallets or manual tokens tracked yet." />
        <Link
          href="/wallets"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Add your first wallet →
        </Link>
        <Link href="/tokens" className="ml-4 inline-block text-sm font-semibold text-emerald-600">Add a token →</Link>
      </>
    );
  }

  const { netWorthUsd, byChain, byWallet, warnings, lastUpdatedIso } = portfolio;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <NetWorthCard
          value={netWorthUsd}
          subtitle={`${portfolio.walletCount} wallet${portfolio.walletCount === 1 ? "" : "s"} · ${portfolio.manualHoldings.length} manual token${portfolio.manualHoldings.length === 1 ? "" : "s"} · updated ${timeAgo(lastUpdatedIso)}`}
        />
        <form action={refreshPortfolio}>
          <SubmitButton
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            pendingLabel="Refreshing…"
          >
            ↻ Refresh
          </SubmitButton>
        </form>
      </div>

      <Link href="/tokens" className="mt-4 inline-block text-sm font-semibold text-emerald-600">Add a token →</Link>

      {byChain.length > 0 || portfolio.manualHoldings.length > 0 ? (
        <AllocationBar byChain={byChain} total={netWorthUsd} manualUsd={portfolio.manualHoldings.reduce((sum, h) => sum + (h.usdValue ?? 0), 0)} />
      ) : null}

      {warnings.length > 0 ? (
        <ul className="mt-6 space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
          {warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      ) : null}

      {byWallet.length > 0 ? <WalletTotals byWallet={byWallet} netWorthUsd={netWorthUsd} /> : null}
      {portfolio.manualHoldings.length > 0 ? <ManualHoldingsList rows={portfolio.manualHoldings} /> : null}
    </>
  );
}

function WalletTotals({
  byWallet,
  netWorthUsd,
}: {
  byWallet: PortfolioView["byWallet"];
  netWorthUsd: number;
}) {
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        By wallet
      </h2>
      {byWallet.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          No wallets to break down yet.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800/60 dark:border-zinc-800 dark:bg-zinc-950">
          {byWallet.map((w) => {
            const pct = netWorthUsd > 0 ? (w.totalUsd / netWorthUsd) * 100 : 0;
            return (
              <li
                key={w.walletId}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`w-20 shrink-0 rounded-full py-0.5 text-center text-xs font-medium ${CHAIN_BADGE[w.chain]}`}
                  >
                    {chainShortLabel(w.chain)}
                  </span>
                  <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {walletName(w.walletLabel, w.address)}
                  </span>
                  <span className="hidden shrink-0 text-xs text-zinc-400 sm:inline">
                    {w.rows.length} asset{w.rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatUsd(w.totalUsd)}
                  </p>
                  <p className="text-xs text-zinc-400">{pct.toFixed(1)}%</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NetWorthCard({ value, subtitle }: { value: number; subtitle: string }) {
  return (
    <section className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Total net worth</p>
      <p className="mt-1 break-words text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        {formatUsd(value)}
      </p>
      <p className="mt-2 text-xs text-zinc-400">{subtitle}</p>
    </section>
  );
}

function AllocationBar({
  byChain,
  total,
  manualUsd,
}: {
  byChain: { chain: ChainKind; usd: number }[];
  total: number;
  manualUsd: number;
}) {
  if (total <= 0) return null;
  return (
    <div className="mt-6">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        {byChain.map((c) => (
          <div
            key={c.chain}
            className={CHAIN_COLOR[c.chain]}
            style={{ width: `${(c.usd / total) * 100}%` }}
            title={`${chainLabel(c.chain)}: ${formatUsd(c.usd)}`}
          />
        ))}
        {manualUsd > 0 ? <div className="bg-sky-500" style={{ width: `${(manualUsd / total) * 100}%` }} title={`Manual tokens: ${formatUsd(manualUsd)}`} /> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        {byChain.map((c) => (
          <span key={c.chain} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${CHAIN_COLOR[c.chain]}`} />
            <span className="text-zinc-600 dark:text-zinc-300">
              {chainLabel(c.chain)}
            </span>
            <span className="text-zinc-400">
              {((c.usd / total) * 100).toFixed(1)}%
            </span>
          </span>
        ))}
        {manualUsd > 0 ? <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /><span>Manual tokens</span><span className="text-zinc-400">{((manualUsd / total) * 100).toFixed(1)}%</span></span> : null}
      </div>
    </div>
  );
}
