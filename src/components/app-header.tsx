"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/wallets", label: "Wallets" },
  { href: "/account", label: "Account" },
];

export function AppHeader({ account }: { account: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <span className="text-emerald-500">●</span> Pango
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "rounded-lg bg-zinc-100 px-3 py-1.5 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "rounded-lg px-3 py-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden font-mono text-xs text-zinc-500 dark:text-zinc-400 sm:inline">
            {account}
          </span>
          <form action={signOut}>
            <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
