import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const fieldClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export const buttonClass =
  "w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60";

export function AuthShell({
  title,
  subtitle,
  error,
  message,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  error?: string;
  message?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          <span className="text-emerald-500">●</span> Pango
        </Link>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          ) : null}

          {!isSupabaseConfigured ? (
            <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
              Supabase keys not set yet - auth is disabled. Add them to
              <code className="mx-1 font-mono">.env.local</code> to enable.
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              {message}
            </p>
          ) : null}

          <div className="mt-5">{children}</div>
        </div>

        {footer ? (
          <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
