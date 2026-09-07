import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getManualHoldings } from "@/lib/manual-holdings";
import { getCoinMarkets, resolveCoinSlug, searchCoins, type CoinMarket, type CoinSearchResult } from "@/lib/prices/coingecko";
import { ManualTokenForm } from "@/components/manual-token-form";
import { ManualHoldingsList } from "@/components/manual-holdings-list";
import { coinGeckoUrl, coinSlugFromUrl } from "@/lib/coingecko-links";

export default async function TokensPage({ searchParams }: { searchParams: Promise<{ q?: string; coin?: string; error?: string; message?: string }> }) {
  const params = await searchParams;
  if (!isSupabaseConfigured) return <p>Connect Supabase to add manual tokens.</p>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 2048) : "";
  const coinId = typeof params.coin === "string" ? params.coin : "";
  const holdings = await getManualHoldings(supabase, user.id);
  let results: CoinSearchResult[] = [];
  let selected: CoinMarket | undefined;
  let lookupError = "";
  let slug: string | null = null;
  if (!coinId && query) {
    try { slug = coinSlugFromUrl(query); }
    catch (error) { lookupError = (error as Error).message; }
  }
  try {
    if (!lookupError && coinId && coinId.length <= 200 && /^[a-z0-9_-]+$/.test(coinId)) {
      selected = (await getCoinMarkets([coinId])).get(coinId);
      if (!selected) lookupError = "Token unavailable. Search for another token.";
    } else if (!lookupError && slug) {
      const resolved = await resolveCoinSlug(slug);
      selected = resolved.coin;
      results = resolved.candidates;
      if (!selected && !results.length) lookupError = "No supported token found for this CoinGecko link. Try searching its name or symbol.";
    } else if (!lookupError && query) results = await searchCoins(query.slice(0, 100));
  } catch { lookupError = "CoinGecko is unavailable right now. Please try again."; }
  return <>
    <h1 className="text-2xl font-bold tracking-tight">Tokens</h1>
    <p className="mt-1 text-sm text-zinc-500">Track purchases with token quantity or USD spent. Prices and token details come from CoinGecko.</p>
    {params.message ? <p role="status" className="mt-4 text-sm text-emerald-600">{params.message}</p> : null}
    {[params.error, lookupError, ...holdings.warnings].filter(Boolean).map((error, i) => <p role="alert" key={i} className="mt-4 text-sm text-amber-700 dark:text-amber-400">{error}</p>)}
    <form action="/tokens" className="mt-6 flex items-end gap-3">
      <label className="min-w-0 flex-1 text-sm">Search by name, symbol, or CoinGecko link
        <input name="q" defaultValue={query} required maxLength={2048} placeholder="Bitcoin, ETH, or paste a CoinGecko link" className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700" />
      </label>
      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Search</button>
    </form>
    {query && !selected && !lookupError ? <div className="mt-4">
      <p className="text-xs text-zinc-500">{results.length ? slug ? "We couldn’t verify an exact match for this link. Check CoinGecko and select the intended token below." : "Select the exact token. Symbols may be shared by multiple tokens." : "No tokens found. Try a different name or symbol."}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">{results.map((coin) => (
        <li key={coin.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <Link prefetch={false} href={`/tokens?${new URLSearchParams({ q: query, coin: coin.id })}`} className="block rounded hover:text-emerald-600 focus-visible:outline-emerald-500">
            <span className="font-medium">{coin.name} ({coin.symbol.toUpperCase()})</span>
            <span className="block break-all text-xs text-zinc-500">{coin.id}</span>
            <span className="mt-2 inline-block text-xs font-medium text-emerald-600 dark:text-emerald-400">Select token →</span>
          </Link>
          <a href={coinGeckoUrl(coin.id)} target="_blank" rel="noopener noreferrer" aria-label={`Verify ${coin.name} on CoinGecko (opens in a new tab)`} className="mt-2 inline-block text-xs text-zinc-500 underline underline-offset-4 hover:text-emerald-600 dark:text-zinc-400">Verify on CoinGecko ↗</a>
        </li>
      ))}</ul>
    </div> : null}
    {selected ? <ManualTokenForm key={selected.id} coin={selected} today={new Date().toISOString().slice(0, 10)} /> : null}
    <ManualHoldingsList rows={holdings.rows} removable />
    <p className="mt-6 text-xs text-zinc-500">Market data by <a href="https://www.coingecko.com/en/api" className="underline">CoinGecko</a>. Avoid adding tokens already tracked in a wallet.</p>
  </>;
}
