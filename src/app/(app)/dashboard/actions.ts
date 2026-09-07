"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserPortfolio } from "@/lib/portfolio-service";

// Forces a live re-fetch (bypassing the snapshot TTL) and writes fresh
// snapshots, then re-renders the dashboard from the now-fresh cache.
export async function refreshPortfolio() {
  await getUserPortfolio({ force: true });
  revalidatePath("/dashboard");
  revalidatePath("/tokens");
  redirect("/dashboard");
}
