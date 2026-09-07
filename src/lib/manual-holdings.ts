import { getManualPrices } from "@/lib/prices/manual-cache";
import { createClient } from "@/lib/supabase/server";

export function parsePurchase(form: FormData, today = new Date().toISOString().slice(0, 10)) {
  const coinId = String(form.get("coinId") ?? "").trim();
  const mode = String(form.get("mode") ?? "");
  const basis = String(form.get("basis") ?? "");
  const amount = Number(form.get("amount"));
  const note = String(form.get("note") ?? "").trim();
  if (!coinId || coinId.length > 200 || !/^[a-z0-9_-]+$/.test(coinId)) throw new Error("Select a token from CoinGecko.");
  if (mode !== "quantity" && mode !== "spent") throw new Error("Choose quantity or USD spent.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
  if (note.length > 1000) throw new Error("Keep the note under 1,000 characters.");
  let buyPrice: number | null = null;
  let buyDate: string | null = null;
  if (basis === "price") {
    buyPrice = Number(form.get("buyPrice"));
    if (!Number.isFinite(buyPrice) || buyPrice <= 0) throw new Error("Enter a buy price greater than zero.");
  } else if (basis === "date") {
    buyDate = String(form.get("buyDate") ?? "");
    const date = new Date(`${buyDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(buyDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== buyDate || buyDate > today) {
      throw new Error("Enter a valid buy date that is not in the future (UTC).");
    }
  } else throw new Error("Choose a buy price or buy date.");
  return { coinId, mode, amount, buyPrice, buyDate, note };
}

export function purchaseQuantity(mode: string, amount: number, price: number) {
  const quantity = mode === "spent" ? amount / price : amount;
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(quantity * price)) {
    throw new Error("This purchase is too large or too small. Check the amount and buy price.");
  }
  return quantity;
}

interface DbManualHolding {
  id: string;
  coingecko_id: string;
  symbol: string;
  quantity: number | string;
  cost_basis_price: number | string | null;
  cost_basis_date: string | null;
  note: string | null;
}

export interface ManualHolding {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number | null;
  buyDate: string | null;
  note: string | null;
  priceUsd: number | null;
  usdValue: number | null;
  costUsd: number | null;
  gainUsd: number | null;
  priceUpdatedAt: string | null;
  priceStale: boolean;
}

export async function getManualHoldings(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, force = false, cacheAdmin?: Parameters<typeof getManualPrices>[3]) {
  const { data, error } = await supabase.from("manual_holdings")
    .select("id, coingecko_id, symbol, quantity, cost_basis_price, cost_basis_date, note")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return { rows: [] as ManualHolding[], warnings: ["Manual tokens could not be loaded. Net worth may be incomplete."] };
  const holdings = (data ?? []) as DbManualHolding[];
  const { prices, warnings } = await getManualPrices(supabase, holdings.map((h) => h.coingecko_id), force, cacheAdmin);
  const rows = holdings.map((h): ManualHolding => {
    const cached = prices.get(h.coingecko_id);
    const coin = cached?.coin;
    const quantity = Number(h.quantity);
    const buyPrice = h.cost_basis_price === null ? null : Number(h.cost_basis_price);
    const priceUsd = coin?.current_price ?? null;
    const rawValue = priceUsd === null ? null : quantity * priceUsd;
    const usdValue = rawValue !== null && Number.isFinite(rawValue) ? rawValue : null;
    const rawCost = buyPrice === null ? null : quantity * buyPrice;
    const costUsd = rawCost !== null && Number.isFinite(rawCost) ? rawCost : null;
    return { id: h.id, coinId: h.coingecko_id, symbol: coin?.symbol || h.symbol,
      name: coin?.name ?? h.coingecko_id, quantity, buyPrice, buyDate: h.cost_basis_date,
      note: h.note, priceUsd, usdValue, costUsd,
      priceUpdatedAt: cached?.fetchedAt ?? null, priceStale: cached?.stale ?? false,
      gainUsd: usdValue !== null && costUsd !== null ? usdValue - costUsd : null };
  });
  if (!warnings.length && rows.some((r) => r.usdValue === null)) warnings.push("Some manual tokens have no current USD price and are excluded from net worth.");
  return { rows, warnings };
}
