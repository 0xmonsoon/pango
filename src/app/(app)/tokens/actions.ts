"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCoinMarkets, getHistoricalPrice } from "@/lib/prices/coingecko";
import { parsePurchase, purchaseQuantity } from "@/lib/manual-holdings";

export async function addManualToken(_state: { error: string }, form: FormData) {
  if (!isSupabaseConfigured) return { error: "Connect Supabase to save tokens." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let purchase;
  try { purchase = parsePurchase(form); }
  catch (error) { return { error: (error as Error).message }; }

  let coin;
  try { coin = (await getCoinMarkets([purchase.coinId])).get(purchase.coinId); }
  catch { return { error: "CoinGecko could not verify this token. Please try again." }; }
  if (!coin) return { error: "Token not found on CoinGecko. Search and select it again." };

  let price = purchase.buyPrice;
  if (purchase.buyDate) {
    try { price = await getHistoricalPrice(purchase.coinId, new Date(`${purchase.buyDate}T00:00:00Z`)); }
    catch { return { error: "Historical price lookup failed. The date may be outside your CoinGecko plan’s range. Try again or enter the buy price instead." }; }
  }
  if (price === null) return { error: "No historical USD price is available for this date. Enter the buy price instead." };
  let quantity;
  try { quantity = purchaseQuantity(purchase.mode, purchase.amount, price); }
  catch (error) { return { error: (error as Error).message }; }

  const { error } = await supabase.from("manual_holdings").insert({
    user_id: user.id, coingecko_id: coin.id, symbol: coin.symbol.toUpperCase(),
    quantity, cost_basis_price: price, cost_basis_date: purchase.buyDate, note: purchase.note || null,
  });
  if (error) return { error: "Could not save the token. Please try again." };
  revalidatePath("/tokens");
  revalidatePath("/dashboard");
  redirect("/tokens?message=Token+added.");
}

export async function removeManualToken(form: FormData) {
  if (!isSupabaseConfigured) redirect("/tokens");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("manual_holdings").delete()
    .eq("id", String(form.get("id") ?? "")).eq("user_id", user.id);
  if (error) redirect("/tokens?error=Could+not+remove+the+token.+Please+try+again.");
  revalidatePath("/tokens");
  revalidatePath("/dashboard");
  redirect("/tokens?message=Token+removed.");
}
