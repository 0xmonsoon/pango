"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";

// Read-only display of an access key with a copy button. Used on the account page.
export function KeyBox({ accessKey }: { accessKey: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (await copyToClipboard(accessKey)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      <div className="select-all break-all rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
        {accessKey}
      </div>
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {copied ? "Copied ✓" : "Copy key"}
      </button>
    </div>
  );
}
