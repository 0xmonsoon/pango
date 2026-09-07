import type { ManualHolding } from "@/lib/manual-holdings";
import { formatTokenPrice, formatUsd } from "@/lib/format";
import { removeManualToken } from "@/app/(app)/tokens/actions";
import { SubmitButton } from "@/components/submit-button";
import { coinGeckoUrl } from "@/lib/coingecko-links";

export function ManualHoldingsList({ rows, removable = false }: { rows: ManualHolding[]; removable?: boolean }) {
  return <div className="mt-6 space-y-3">
    <h2 className="text-sm font-semibold">Manual tokens</h2>
    {rows.length === 0 ? <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">No manual tokens yet. Search above to add one.</p> : rows.map((h) => (
      <article key={h.id} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="break-words font-semibold">
              <a
                href={coinGeckoUrl(h.coinId)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${h.name} on CoinGecko (opens in a new tab)`}
                className="rounded underline decoration-zinc-300 underline-offset-4 hover:text-emerald-600 hover:decoration-emerald-500 focus-visible:outline-emerald-500 dark:decoration-zinc-700 dark:hover:text-emerald-400"
              >
                {h.name} <span aria-hidden="true" className="text-xs">↗</span>
              </a>{" "}
              <span className="text-zinc-500">{h.symbol.toUpperCase()}</span>
            </h3>
            <p className="break-all text-xs text-zinc-500">{h.coinId}</p>
          </div>
          {removable ? <form action={removeManualToken}><input type="hidden" name="id" value={h.id} /><SubmitButton pendingLabel="Removing…" className="text-xs text-red-600 hover:underline">Remove</SubmitButton></form> : null}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-zinc-500">Quantity</dt><dd className="break-all tabular-nums">{h.quantity.toLocaleString("en-US", { maximumSignificantDigits: 12 })}</dd></div>
          <div><dt className="text-xs text-zinc-500">Current price</dt><dd>{h.priceUsd === null ? "Unavailable" : formatTokenPrice(h.priceUsd)}</dd></div>
          <div><dt className="text-xs text-zinc-500">Value</dt><dd>{h.usdValue === null ? "Unavailable" : formatUsd(h.usdValue)}</dd></div>
          <div><dt className="text-xs text-zinc-500">Unrealized gain / loss</dt><dd className={h.gainUsd === null ? "" : h.gainUsd >= 0 ? "text-emerald-600" : "text-red-600"}>{h.gainUsd === null ? "Unavailable" : formatUsd(h.gainUsd)}</dd></div>
        </dl>
        {h.priceUpdatedAt ? <p className={`mt-3 text-xs ${h.priceStale ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"}`}>
          {h.priceStale ? "Using last cached price" : "Price updated"}: {h.priceUpdatedAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}
        </p> : null}
        <p className="mt-3 text-xs text-zinc-500">Buy price: {h.buyPrice === null ? "Unknown" : formatTokenPrice(h.buyPrice)}{h.buyDate ? ` · Historical estimate for ${h.buyDate} (UTC)` : ""} · Cost: {h.costUsd === null ? "Unknown" : formatUsd(h.costUsd)}</p>
        {h.note ? <p className="mt-2 break-words text-sm text-zinc-500">{h.note}</p> : null}
      </article>
    ))}
  </div>;
}
