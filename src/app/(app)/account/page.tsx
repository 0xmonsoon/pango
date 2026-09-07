import { cookies } from "next/headers";
import { ACCESS_KEY_COOKIE } from "@/lib/auth/access-key";
import { KeyBox } from "@/components/key-box";

// Lets a signed-in user view their access key again. The raw key isn't stored
// server-side, so we can only show it if it's still in this session's cookie
// (set when they signed up or last signed in on this device).
export default async function AccountPage() {
  const accessKey = (await cookies()).get(ACCESS_KEY_COOKIE)?.value;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Your access key
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        This is the only credential for your account. Keep it in a password
        manager - it can&apos;t be reset or recovered.
      </p>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {accessKey ? (
          <KeyBox accessKey={accessKey} />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Your key isn&apos;t available in this session - for security it&apos;s
            only held after you sign in on a device. Sign out and back in with your
            key to view it here again.
          </p>
        )}
      </div>
    </div>
  );
}
