// Access-key auth: the user's whole identity is one long random string ("key").
// We never store the raw key - Supabase only ever sees sha256(key) as the email
// local-part and the key itself as the (bcrypt-hashed) password. So the key alone
// is the single secret needed to sign in, and it can't be recovered from the DB.
//
// Server-only (uses Web Crypto + is imported by server actions). Never import
// this into a Client Component.

const KEY_BYTES = 32; // → 64 hex chars; well under bcrypt's 72-char password limit
const DOMAIN = "pango.local";

// httpOnly cookie that holds the raw key for the current session so a signed-in
// user can view it again (it's never stored server-side). Lives here rather than
// in the "use server" actions file, which may only export async functions.
export const ACCESS_KEY_COOKIE = "pango_access_key";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// A fresh, cryptographically-random access key shown to the user once at signup.
export function generateAccessKey(): string {
  const bytes = new Uint8Array(KEY_BYTES);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

// Cheap shape check so we can reject obviously-bad input before hitting Supabase.
export function isValidAccessKey(key: string): boolean {
  return /^[0-9a-f]{64}$/.test(key);
}

// Deterministically map a key → the synthetic Supabase email. Same key in, same
// email out, so sign-in is just "paste the key, re-derive the email, log in".
export async function accessKeyToEmail(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `${toHex(new Uint8Array(digest))}@${DOMAIN}`;
}
