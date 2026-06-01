import { fetchJson } from "@/lib/http";
import { emptyResult, sumRows } from "./types";
import type { AdapterResult, ChainAdapter, HoldingRow } from "./types";
import type { ChainKind } from "@/lib/chains";

// Tokens + DeFi positions via the Zerion API. One key covers both EVM and Solana.
// Requires ZERION_API_KEY (free dev keys begin with `zk_`) — no-ops without it.
// Auth is HTTP Basic with the key as the username and an empty password.
//
// Two chain-specific quirks, verified against live calls (do not "simplify" away):
//  - The default chain set is EVM-only, so a Solana address returns nothing unless
//    we pass filter[chain_ids]=solana explicitly.
//  - filter[positions]=only_complex / no_filter are NOT supported for Solana
//    ("not supported for Solana addresses"), so Solana must use only_simple —
//    i.e. Zerion exposes Solana token balances but not Solana DeFi positions yet.
const BASE = "https://api.zerion.io/v1";
const KEY = process.env.ZERION_API_KEY;

// Basic auth header: base64("<key>:"). btoa works in both Node and edge runtimes.
const AUTH = KEY ? `Basic ${btoa(`${KEY}:`)}` : null;

// Zerion's free tier allows ~1 request/second. The aggregator fans out across
// all wallets at once, so we funnel every Zerion call through one serialized
// queue that spaces requests out — otherwise concurrent wallets get throttled
// (HTTP 429) and come back empty. Module-global so it spans the whole process.
const MIN_INTERVAL_MS = 1100;
let queue: Promise<unknown> = Promise.resolve();
let lastStartedAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function throttle<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const wait = lastStartedAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastStartedAt = Date.now();
    return task();
  });
  // Keep the chain alive (and ordered) regardless of this task's outcome.
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

const THROTTLE_RE = /429|throttl|too many requests/i;

// Brackets are percent-encoded so the URL is valid for the WHATWG fetch parser.
const QUERY: Record<ChainKind, string> = {
  evm: "currency=usd&filter%5Bpositions%5D=no_filter&filter%5Btrash%5D=only_non_trash&sort=value",
  solana:
    "currency=usd&filter%5Bchain_ids%5D=solana&filter%5Bpositions%5D=only_simple&filter%5Btrash%5D=only_non_trash&sort=value",
  // unused — Bitcoin/Zcash have their own adapters
  bitcoin: "",
  zcash: "",
};

interface ZerionPositionAttributes {
  // "wallet" = a plain token balance; anything else is a protocol/staked position.
  position_type?: string;
  // e.g. "lending", "liquidity_pool", "staking" — present for DeFi positions.
  protocol_module?: string;
  name?: string;
  quantity?: { float?: number };
  value?: number | null;
  price?: number | null;
  fungible_info?: { name?: string; symbol?: string };
}

interface ZerionPositionsResponse {
  data?: { attributes?: ZerionPositionAttributes }[];
  errors?: { title?: string; detail?: string }[];
}

// Throttled fetch with retry/backoff on rate-limit (surfaced as either an HTTP
// 429 thrown by fetchJson, or a 200 body carrying an `errors: [throttled]`).
async function fetchPositions(url: string): Promise<ZerionPositionsResponse> {
  const MAX_ATTEMPTS = 4;
  let lastErr = "Zerion request failed";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const data = await throttle(() =>
        fetchJson<ZerionPositionsResponse>(url, {
          headers: { authorization: AUTH! },
          timeoutMs: 15_000,
        }),
      );
      if (data.errors?.length) {
        const detail = data.errors
          .map((e) => e.detail ?? e.title ?? "")
          .join("; ");
        if (THROTTLE_RE.test(detail) && attempt < MAX_ATTEMPTS) {
          lastErr = detail;
          await sleep(MIN_INTERVAL_MS * attempt);
          continue;
        }
        throw new Error(detail || "Zerion returned an error");
      }
      return data;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (THROTTLE_RE.test(lastErr) && attempt < MAX_ATTEMPTS) {
        await sleep(MIN_INTERVAL_MS * attempt);
        continue;
      }
      throw new Error(lastErr);
    }
  }
  throw new Error(lastErr);
}

function makeAdapter(chain: ChainKind): ChainAdapter {
  return {
    chain,
    configured: Boolean(AUTH),
    async getHoldings(address: string): Promise<AdapterResult> {
      if (!AUTH) {
        return emptyResult(
          "Zerion API key not set — EVM & Solana tokens and DeFi positions are not tracked yet.",
        );
      }

      let data: ZerionPositionsResponse;
      try {
        data = await fetchPositions(
          `${BASE}/wallets/${address}/positions/?${QUERY[chain]}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          rows: [],
          totalUsd: 0,
          failed: true,
          warnings: [
            THROTTLE_RE.test(msg)
              ? "Zerion rate limit reached (1 req/s) — try Refresh again in a moment."
              : `${chain} fetch failed: ${msg}`,
          ],
        };
      }

      const rows: HoldingRow[] = [];
      for (const pos of data.data ?? []) {
        const a = pos.attributes ?? {};
        const usdValue = typeof a.value === "number" ? a.value : 0;
        if (usdValue <= 0) continue;

        const isToken = (a.position_type ?? "wallet") === "wallet";
        const fungible = a.fungible_info ?? {};
        rows.push({
          kind: isToken ? "token" : "defi",
          chain,
          symbol: fungible.symbol ?? null,
          name: fungible.name ?? a.name ?? null,
          protocol: isToken ? null : (a.protocol_module ?? null),
          amount: a.quantity?.float ?? null,
          priceUsd: typeof a.price === "number" ? a.price : null,
          usdValue,
        });
      }

      // Solana DeFi positions aren't queryable via Zerion yet (only_simple only).
      const warnings =
        chain === "solana"
          ? ["Solana DeFi positions aren't covered by Zerion yet — tokens only."]
          : [];

      return { rows, totalUsd: sumRows(rows), warnings };
    },
  };
}

export const zerionEvmAdapter = makeAdapter("evm");
export const zerionSolanaAdapter = makeAdapter("solana");
