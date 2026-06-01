"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/auth-shell";
import { copyToClipboard } from "@/lib/clipboard";

// Shown once, right after signup. The key is the only way back into the account,
// so we make the user copy it and explicitly acknowledge before continuing.
export function KeyReveal({ accessKey }: { accessKey: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    if (await copyToClipboard(accessKey)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
        This key is your <strong>only</strong>{" "}way to sign in. We can&apos;t
        reset or recover it — if you lose it, the account and its data are gone.
        Store it in a password manager now.
      </p>

      <div className="select-all break-all rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
        {accessKey}
      </div>

      <button
        type="button"
        onClick={copy}
        className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {copied ? "Copied ✓" : "Copy key"}
      </button>

      <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5"
        />
        I&apos;ve saved my access key somewhere safe.
      </label>

      {saved ? (
        <Link href="/dashboard" className={`${buttonClass} block text-center`}>
          Continue to dashboard
        </Link>
      ) : (
        <button type="button" disabled className={buttonClass}>
          Continue to dashboard
        </button>
      )}
    </div>
  );
}
