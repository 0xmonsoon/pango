"use client";

import { useLinkStatus } from "next/link";

// Wraps a <Link>'s label. While the link's navigation is pending
// (useLinkStatus), it hides the label and overlays a centered spinner in its
// place. The label stays in the layout (just `invisible`), so it keeps
// reserving its own width — the link never changes size and the spinner is
// perfectly centered, with no extra trailing space when idle. Must be rendered
// as a descendant of a <Link>.
export function LinkLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={pending ? "invisible" : undefined}>{children}</span>
      {pending ? (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      ) : null}
    </span>
  );
}
