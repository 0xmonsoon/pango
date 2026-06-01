import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getHoldings } from "@/lib/adapters";
import type { HoldingRow } from "@/lib/adapters";
import {
  combinePortfolio,
  emptyPortfolio,
  type Portfolio,
  type Wallet,
  type WalletHoldings,
} from "@/lib/portfolio";

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

export interface PortfolioView extends Portfolio {
  lastUpdatedIso: string | null;
  cachePersisted: boolean;
  configured: boolean;
}

interface DbHoldingRow {
  kind: "token" | "defi";
  chain: Wallet["chain"];
  symbol: string | null;
  name: string | null;
  protocol: string | null;
  amount: string | number | null;
  price_usd: string | number | null;
  usd_value: string | number;
}

function num(v: string | number | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapDbRow(r: DbHoldingRow): HoldingRow {
  return {
    kind: r.kind,
    chain: r.chain,
    symbol: r.symbol,
    name: r.name,
    protocol: r.protocol,
    amount: num(r.amount),
    priceUsd: num(r.price_usd),
    usdValue: num(r.usd_value) ?? 0,
  };
}

// Loads the signed-in user's portfolio: serves fresh cached snapshots when
// available, otherwise fetches live and writes through to the cache.
export async function getUserPortfolio(
  opts: { force?: boolean } = {},
): Promise<PortfolioView | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: walletData } = await supabase
    .from("wallets")
    .select("id, chain, address, label");
  const wallets = (walletData ?? []) as Wallet[];

  if (wallets.length === 0) {
    return {
      ...emptyPortfolio(0),
      lastUpdatedIso: null,
      cachePersisted: hasAdminClient,
      configured: true,
    };
  }

  const admin = hasAdminClient ? createAdminClient() : null;
  const now = Date.now();
  const fetchedAts: number[] = [];

  // Most recent snapshot for a wallet (rows + when it was taken), any age.
  async function latestSnapshot(
    walletId: string,
  ): Promise<{ fetchedAt: number; rows: HoldingRow[] } | null> {
    const { data: snap } = await supabase
      .from("balance_snapshot")
      .select("id, fetched_at")
      .eq("wallet_id", walletId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!snap) return null;
    const { data: rows } = await supabase
      .from("holding_rows")
      .select("kind, chain, symbol, name, protocol, amount, price_usd, usd_value")
      .eq("snapshot_id", snap.id);
    return {
      fetchedAt: new Date(snap.fetched_at).getTime(),
      rows: ((rows ?? []) as DbHoldingRow[]).map(mapDbRow),
    };
  }

  const parts: WalletHoldings[] = await Promise.all(
    wallets.map(async (wallet): Promise<WalletHoldings> => {
      // Serve a fresh cached snapshot first (unless a forced refresh was asked).
      if (!opts.force) {
        const snap = await latestSnapshot(wallet.id);
        if (snap && now - snap.fetchedAt < SNAPSHOT_TTL_MS) {
          fetchedAts.push(snap.fetchedAt);
          return { wallet, rows: snap.rows, warnings: [] };
        }
      }

      // Cache miss / forced: fetch live. (Zerion calls are internally throttled
      // to ≤1/sec, so concurrent wallets queue rather than getting rate-limited.)
      const res = await getHoldings(wallet.chain, wallet.address);

      // A failed fetch must NOT poison the cache or show $0 — fall back to the
      // last good snapshot if we have one, otherwise surface the warning.
      if (res.failed) {
        const snap = await latestSnapshot(wallet.id);
        if (snap) {
          fetchedAts.push(snap.fetchedAt);
          return {
            wallet,
            rows: snap.rows,
            warnings: [...res.warnings, "Showing last cached value (live refresh failed)."],
          };
        }
        fetchedAts.push(now);
        return { wallet, rows: res.rows, warnings: res.warnings };
      }

      fetchedAts.push(now);

      if (admin) {
        const { data: snapIns } = await admin
          .from("balance_snapshot")
          .insert({ wallet_id: wallet.id, total_usd: res.totalUsd })
          .select("id")
          .single();
        if (snapIns && res.rows.length > 0) {
          await admin.from("holding_rows").insert(
            res.rows.map((r) => ({
              snapshot_id: snapIns.id,
              kind: r.kind,
              chain: r.chain,
              symbol: r.symbol,
              name: r.name,
              protocol: r.protocol ?? null,
              amount: r.amount,
              price_usd: r.priceUsd,
              usd_value: r.usdValue,
            })),
          );
        }
      }

      return { wallet, rows: res.rows, warnings: res.warnings };
    }),
  );

  const portfolio = combinePortfolio(parts);
  if (!admin) {
    portfolio.warnings.unshift(
      "Snapshot cache disabled (set SUPABASE_SERVICE_ROLE_KEY); balances are fetched live each load.",
    );
  }

  const oldest = fetchedAts.length ? Math.min(...fetchedAts) : now;
  return {
    ...portfolio,
    lastUpdatedIso: new Date(oldest).toISOString(),
    cachePersisted: Boolean(admin),
    configured: true,
  };
}
