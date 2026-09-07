"use client";

import { useEffect } from "react";
import { useLinkStatus } from "next/link";

// Wraps a <Link>'s label. While the link's navigation is pending
// (useLinkStatus) - or when `forcePending` is set by an external trigger - it
// hides the label and overlays a centered spinner in its place. The label stays
// in the layout (just `invisible`), so it keeps reserving its own width: the
// link never changes size and the spinner is perfectly centered, with no extra
// trailing space when idle. Must be rendered as a descendant of a <Link>.
export function LinkLabel({
  children,
  forcePending = false,
}: {
  children: React.ReactNode;
  forcePending?: boolean;
}) {
  const { pending } = useLinkStatus();
  const showSpinner = pending || forcePending;

  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={showSpinner ? "invisible" : undefined}>{children}</span>
      {showSpinner ? (
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

// Reports its parent <Link>'s pending state to a parent component without
// rendering anything itself. Use it to drive a loading indicator that lives
// somewhere *other* than the clicked link - e.g. the brand logo links to
// /dashboard, but the spinner should show on the Dashboard nav tab. Must be
// rendered as a descendant of a <Link>; `onChange` should be a stable setter.
export function LinkStatusReporter({
  onChange,
}: {
  onChange: (pending: boolean) => void;
}) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    onChange(pending);
  }, [pending, onChange]);

  return null;
}
