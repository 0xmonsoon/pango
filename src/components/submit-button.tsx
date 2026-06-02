"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/auth-shell";

// Small spinner that inherits the button's text color (border-current), so it
// looks right on both the solid emerald buttons and the light bordered ones.
export function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

// Submit button that reflects the parent <form>'s pending state via
// useFormStatus, so the user gets immediate feedback (spinner + disabled) while
// the server action runs. Must be rendered inside the <form> it submits.
// Pass `className` to match the surrounding button styling; defaults to the
// shared auth `buttonClass`.
export function SubmitButton({
  children,
  pendingLabel,
  className = buttonClass,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
