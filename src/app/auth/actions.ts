"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  generateAccessKey,
  isValidAccessKey,
  accessKeyToEmail,
  ACCESS_KEY_COOKIE,
} from "@/lib/auth/access-key";

// The raw key is never persisted server-side, so to let a signed-in user view it
// again we stash it in an httpOnly cookie the moment they provide it (paste at
// login / generate at signup). It lives only on the user's device, scoped to this
// app, and is cleared on sign-out.
async function rememberKey(key: string) {
  const store = await cookies();
  store.set(ACCESS_KEY_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured) fail("/login", "Supabase is not configured yet.");

  const key = String(formData.get("key") ?? "").trim();
  const next = String(formData.get("next") ?? "/dashboard") || "/dashboard";

  if (!isValidAccessKey(key)) {
    fail("/login", "That doesn't look like a valid access key.");
  }

  const email = await accessKeyToEmail(key);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: key,
  });
  // Don't echo the provider message - a wrong key shouldn't leak whether an
  // account exists. It's either valid or it isn't.
  if (error) fail("/login", "Invalid access key.");

  await rememberKey(key);
  revalidatePath("/", "layout");
  redirect(next);
}

// Returned to the signup page via useActionState so it can reveal the generated
// key (we can't redirect - the key must be shown exactly once, then it's gone).
export type SignupState =
  | { ok: true; key: string }
  | { ok: false; error: string }
  | null;

// No params: useActionState passes (prevState, formData), but signup needs
// neither - a zero-arg function is assignable to that signature.
export async function signup(): Promise<SignupState> {
  if (!isSupabaseConfigured || !hasAdminClient) {
    return {
      ok: false,
      error:
        "Auth isn't fully configured - SUPABASE_SERVICE_ROLE_KEY is required to mint accounts.",
    };
  }

  const key = generateAccessKey();
  const email = await accessKeyToEmail(key);

  // Create a pre-confirmed user with the service-role client (no email step).
  const admin = createAdminClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    password: key,
    email_confirm: true,
  });
  if (createErr) return { ok: false, error: createErr.message };

  // Sign the new user in so the session cookie is set before we reveal the key.
  const supabase = await createClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email,
    password: key,
  });
  if (signErr) return { ok: false, error: signErr.message };

  await rememberKey(key);
  revalidatePath("/", "layout");
  return { ok: true, key };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(ACCESS_KEY_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}
