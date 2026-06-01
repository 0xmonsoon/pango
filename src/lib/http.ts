// Small fetch helper with a timeout so a slow upstream can't hang a request.
export async function fetchJson<T = unknown>(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 12_000,
  );
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", ...opts.headers },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
