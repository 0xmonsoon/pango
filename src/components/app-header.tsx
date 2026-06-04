"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { LinkPending } from "@/components/link-pending";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/wallets", label: "Wallets" },
  { href: "/account", label: "Account" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* Top row: brand + account/sign-out */}
        <div className="flex items-center justify-between gap-2 py-3 sm:py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <span className="text-emerald-500">●</span> Pango
          </Link>
          <form action={signOut}>
            <SubmitButton
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              pendingLabel="Signing out…"
            >
              Sign out
            </SubmitButton>
          </form>
        </div>
        {/* Nav tabs on their own row — scroll horizontally on very small screens */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-2 text-sm sm:pb-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={
                  active
                    ? "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }
              >
                {item.label}
                <LinkPending />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
