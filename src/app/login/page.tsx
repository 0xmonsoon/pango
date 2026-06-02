import Link from "next/link";
import { login } from "@/app/auth/actions";
import { AuthShell, fieldClass } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <AuthShell
      title="Sign in to Pango"
      subtitle="Paste your access key to continue."
      error={error}
      message={message}
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="font-medium text-emerald-600">
            Create one
          </Link>
        </>
      }
    >
      <form action={login} className="space-y-3">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <textarea
          name="key"
          required
          rows={3}
          placeholder="Paste your access key"
          autoComplete="off"
          spellCheck={false}
          className={`${fieldClass} resize-none break-all font-mono`}
        />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}
