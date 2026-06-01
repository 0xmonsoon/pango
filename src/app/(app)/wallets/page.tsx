import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CHAINS, type ChainKind } from "@/lib/chains";
import { getUserPortfolio } from "@/lib/portfolio-service";
import type { WalletBreakdown } from "@/lib/portfolio";
import { WalletCard } from "@/components/wallet-card";
import { addWallet } from "./actions";

interface Wallet {
  id: string;
  chain: ChainKind;
  address: string;
  label: string | null;
  created_at: string;
}

export default async function WalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  let wallets: Wallet[] = [];
  const breakdowns = new Map<string, WalletBreakdown>();
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("wallets")
      .select("id, chain, address, label, created_at")
      .order("created_at", { ascending: false });
    wallets = (data as Wallet[] | null) ?? [];

    // Per-wallet asset breakdown (served from the snapshot cache when fresh).
    const portfolio = await getUserPortfolio();
    for (const w of portfolio?.byWallet ?? []) breakdowns.set(w.walletId, w);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Wallets
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Addresses you add here are tracked across your portfolio.
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
          Supabase keys not set — connect a project in{" "}
          <code className="font-mono">.env.local</code> to save wallets.
        </p>
      ) : null}
      {error ? (
        <p className="mb-6 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-6 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      {/* Add wallet form */}
      <form
        action={addWallet}
        className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_160px]">
          <select
            name="chain"
            defaultValue="evm"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {CHAINS.map((c) => (
              <option key={c.kind} value={c.kind}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            name="address"
            required
            placeholder="Wallet address"
            autoComplete="off"
            spellCheck={false}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <input
            name="label"
            placeholder="Label (optional)"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-400">
            EVM addresses cover all EVM chains. Zcash supports transparent
            (t-addr) only.
          </p>
          <button className="w-full shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 sm:w-auto">
            Add wallet
          </button>
        </div>
      </form>

      {/* Wallet list with per-wallet asset breakdown */}
      {wallets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No wallets yet. Add one above to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {wallets.map((w) => (
            <WalletCard key={w.id} wallet={w} breakdown={breakdowns.get(w.id)} />
          ))}
        </div>
      )}
    </>
  );
}
