"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "@/app/auth/actions";
import { AuthShell, buttonClass } from "@/components/auth-shell";
import { KeyReveal } from "@/components/key-reveal";
import { Spinner } from "@/components/submit-button";

export default function SignupPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(
    signup,
    null,
  );

  if (state?.ok) {
    return (
      <AuthShell
        title="Your access key"
        subtitle="Copy it and keep it safe — you'll need it to sign in."
      >
        <KeyReveal accessKey={state.key} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="No email, no password. We generate one secret access key — that's your whole login."
      error={state && !state.ok ? state.error : undefined}
      footer={
        <>
          Already have a key?{" "}
          <Link href="/login" className="font-medium text-emerald-600">
            Sign in
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          We&apos;ll generate a one-of-a-kind access key for you. It&apos;s the
          only way to sign in, and it can&apos;t be recovered — so save it as soon
          as you see it.
        </p>
        <button
          type="submit"
          disabled={pending}
          className={`${buttonClass} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed`}
        >
          {pending ? (
            <>
              <Spinner />
              Generating…
            </>
          ) : (
            "Generate my access key"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
