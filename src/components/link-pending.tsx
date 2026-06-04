"use client";

import { useLinkStatus } from "next/link";

// Inline spinner that lights up while its parent <Link>'s navigation is pending
// (useLinkStatus). Must be rendered as a descendant of a <Link>, and that Link
// should set `prefetch={false}` — a prefetched route skips the pending state.
//
// The element is always rendered at a fixed size and only toggles opacity, so it
// reserves its own space and never shifts layout when it appears/disappears.
export function LinkPending() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent transition-opacity ${
        pending ? "animate-spin opacity-100" : "opacity-0"
      }`}
    />
  );
}
