"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { chainLabel, isChainKind, isValidAddress } from "@/lib/chains";

function back(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/wallets${qs ? `?${qs}` : ""}`);
}

export async function addWallet(formData: FormData) {
  if (!isSupabaseConfigured) {
    back({ error: "Connect Supabase to add wallets." });
  }

  const chain = String(formData.get("chain") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!isChainKind(chain)) back({ error: "Pick a chain." });
  if (!isValidAddress(chain, address)) {
    back({ error: `That doesn't look like a valid ${chainLabel(chain)} address.` });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("wallets").insert({
    user_id: user.id,
    chain,
    address,
    label: label || null,
  });

  if (error) {
    back({
      error:
        error.code === "23505"
          ? "That address is already being tracked."
          : error.message,
    });
  }

  revalidatePath("/wallets");
  back({ message: "Wallet added." });
}

export async function removeWallet(formData: FormData) {
  if (!isSupabaseConfigured) back({});

  const id = String(formData.get("id") ?? "");
  if (!id) back({});

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already scopes to the owner; the user_id filter is defense in depth.
  await supabase.from("wallets").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/wallets");
  back({});
}
