import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AppHeader } from "@/components/app-header";

// Shared shell for authenticated pages. Guards access and renders the nav.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The email is sha256(key)@pango.local — meaningless to a human — so we show a
  // short opaque tag (first 8 hex chars of the hash) just to identify the session.
  let account = "demo";

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    account = user.email?.split("@")[0]?.slice(0, 8) ?? account;
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <AppHeader account={account} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
