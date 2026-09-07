"use client";

import { useActionState, useState } from "react";
import { addManualToken } from "@/app/(app)/tokens/actions";
import type { CoinMarket } from "@/lib/prices/coingecko";
import { formatTokenPrice } from "@/lib/format";
import { coinGeckoUrl } from "@/lib/coingecko-links";

const inputClass = "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:[color-scheme:dark]";
const selectClass = `${inputClass} token-select cursor-pointer appearance-none pr-10`;

export function ManualTokenForm({ coin, today }: { coin: CoinMarket; today: string }) {
  const [state, action, pending] = useActionState(addManualToken, { error: "" });
  const [mode, setMode] = useState("quantity");
  const [basis, setBasis] = useState("price");
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [note, setNote] = useState("");
  const quantity = mode === "spent" ? Number(amount) / Number(buyPrice) : Number(amount);
  return (
    <form action={action} className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="font-semibold">Add {coin.name} ({coin.symbol.toUpperCase()})</h2>
      <p className="mt-1 text-sm text-zinc-500">Current price: {coin.current_price === null ? "Unavailable" : formatTokenPrice(coin.current_price)} · USD</p>
      <a href={coinGeckoUrl(coin.id)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-medium text-emerald-600 underline underline-offset-4 dark:text-emerald-400">Verify on CoinGecko ↗</a>
      <input type="hidden" name="coinId" value={coin.id} />
      <fieldset disabled={pending} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Amount type
          <select name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className={selectClass}>
            <option value="quantity">Token quantity</option><option value="spent">USD spent</option>
          </select>
        </label>
        <label className="text-sm">{mode === "quantity" ? "Quantity" : "Amount spent (USD)"}
          <input name="amount" type="number" step="any" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">Purchase details
          <select name="basis" value={basis} onChange={(e) => setBasis(e.target.value)} className={selectClass}>
            <option value="price">Enter buy price</option><option value="date">Look up by buy date</option>
          </select>
        </label>
        {basis === "price" ? <label className="text-sm">Buy price per token (USD)
          <input name="buyPrice" type="number" step="any" min="0" required value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} className={inputClass} />
        </label> : <label className="text-sm">Buy date (UTC)
          <input name="buyDate" type="date" max={today} required value={buyDate} onChange={(e) => setBuyDate(e.target.value)} className={inputClass} />
        </label>}
        <label className="text-sm sm:col-span-2">Note (optional)
          <input name="note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </label>
      </fieldset>
      <p className="mt-3 text-xs text-zinc-500">{basis === "date" ? "Uses CoinGecko’s historical daily USD price, which may differ from your actual trade. If unavailable, enter your buy price." : "Use the price you paid per token."} {mode === "spent" ? "Quantity = USD spent ÷ buy price, excluding fees." : "Enter the number of tokens you own."}</p>
      {mode === "spent" && basis === "price" && Number(buyPrice) > 0 && quantity > 0 && Number.isFinite(quantity) ? <p className="mt-2 text-sm">Calculated quantity: {quantity.toLocaleString("en-US", { maximumSignificantDigits: 12 })} {coin.symbol.toUpperCase()}</p> : null}
      <p role="alert" className="mt-3 text-sm text-red-600">{state.error}</p>
      <button disabled={pending} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{pending ? "Saving…" : "Add token"}</button>
    </form>
  );
}
