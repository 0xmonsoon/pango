import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LinkLabel } from "@/components/link-label";

const CHAINS = ["EVM", "Solana", "Bitcoin", "Zcash (transparent)"];

// Auth-aware so a returning, signed-in visitor lands on "Enter app" instead of
// being shown "Sign in" again — their session cookie persists for ~400 days, so
// the homepage should reflect that rather than always rendering the logged-out CTA.
export default async function Home() {
  let signedIn = false;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-20 text-center dark:bg-black">
      <div className="mb-6 flex items-center gap-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        <span className="text-emerald-500">●</span> Pango
      </div>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
        Your entire crypto net worth, in one place.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Track tokens and DeFi positions across chains, plus manually-entered
        assets with cost basis — all in a single portfolio view.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {CHAINS.map((c) => (
          <span
            key={c}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        {signedIn ? (
          <Link
            href="/dashboard"
            prefetch={false}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <LinkLabel>Enter app</LinkLabel>
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
