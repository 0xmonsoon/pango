"use client";

import { useState } from "react";
import { chainShortLabel, type ChainKind } from "@/lib/chains";
import { formatUsd, shortenAddress } from "@/lib/format";
import type { WalletBreakdown } from "@/lib/portfolio";
import { removeWallet } from "@/app/(app)/wallets/actions";
import { SubmitButton } from "@/components/submit-button";

interface WalletCardProps {
  wallet: { id: string; chain: ChainKind; address: string; label: string | null };
  breakdown: WalletBreakdown | undefined;
}

// A wallet row that's collapsed by default and expands to show its assets (and a
// Remove button) on click. The collapsed row stays compact for small screens.
export function WalletCard({ wallet, breakdown }: WalletCardProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className="flex items-center gap-2.5 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 sm:gap-3 sm:px-5 sm:py-4"
      >
        <span
          className={`shrink-0 text-xs text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▶
        </span>
        <span className="w-20 shrink-0 rounded-full border border-zinc-300 py-0.5 text-center text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {chainShortLabel(wallet.chain)}
        </span>
        <div className="min-w-0 flex-1">
          {wallet.label ? (
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {wallet.label}
            </p>
          ) : null}
          <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {shortenAddress(wallet.address)}
          </p>
        </div>
        {breakdown ? (
          <span className="shrink-0 text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatUsd(breakdown.totalUsd)}
          </span>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-zinc-100 dark:border-zinc-800/60">
          <WalletAssets breakdown={breakdown} />
          <div className="flex justify-end border-t border-zinc-100 px-4 py-3 dark:border-zinc-800/60 sm:px-5">
            <form action={removeWallet}>
              <input type="hidden" name="id" value={wallet.id} />
              <SubmitButton
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-red-400 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300"
                pendingLabel="Removing…"
              >
                Remove wallet
              </SubmitButton>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WalletAssets({ breakdown }: { breakdown: WalletBreakdown | undefined }) {
  if (!breakdown || breakdown.rows.length === 0) {
    return (
      <div className="px-4 py-4 text-xs text-zinc-400 sm:px-5">
        {breakdown?.warnings?.length
          ? breakdown.warnings.join(" · ")
          : "No priced assets yet — refresh on the dashboard to load balances."}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
            <th className="px-4 py-2 font-medium sm:px-5">Asset</th>
            <th className="px-4 py-2 text-right font-medium sm:px-5">Amount</th>
            <th className="px-4 py-2 text-right font-medium sm:px-5">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {breakdown.rows.map((r, i) => (
            <tr key={`${r.symbol ?? r.name}-${i}`}>
              <td className="px-4 py-2 sm:px-5">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {r.symbol ?? r.name ?? "—"}
                </span>
                {r.kind === "defi" ? (
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {r.protocol ?? "DeFi"}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-300 sm:px-5">
                {r.amount === null
                  ? "—"
                  : r.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </td>
              <td className="px-4 py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100 sm:px-5">
                {formatUsd(r.usdValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
