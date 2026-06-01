# Pango — Crypto Portfolio Tracker

A website where a user signs in with a generated access key (a long random
string — their only credential, no email/password), adds wallet addresses across
chains, and sees a unified net worth that includes tokens, DeFi positions, and
manually-entered assets.

## Supported chains & data sources

| Need | Source | Notes |
| --- | --- | --- |
| EVM tokens + DeFi positions + net worth | **Zerion API** | `GET /v1/wallets/{address}/positions/?filter[positions]=no_filter`. USD-valued. Basic auth (key as username). |
| Solana token balances | **Zerion API** | Same endpoint/key, but needs `filter[chain_ids]=solana` and only `filter[positions]=only_simple` (Solana DeFi positions are **not** supported by Zerion yet — tokens only). |
| Bitcoin balances | **Blockstream Esplora** (or Blockchair) | Free address balance/UTXO/history. |
| Zcash transparent (t-addrs) | **Blockchair** | Transparent only; shielded z-addrs are not queryable (by design). |
| BTC / ZEC prices + historical cost basis | **CoinGecko** | Current + historical-by-date for manual holdings. |

## Stack

- **Next.js (App Router) + TypeScript + Tailwind**, package manager **Bun**, deploy to Vercel.
- **Supabase**: Postgres + Row-Level Security. Auth is access-key based: signup
  mints a random key and a pre-confirmed user where `email = sha256(key)@pango.local`
  and `password = key` (created via the service-role admin client). The raw key is
  never stored; lose it = lose the account. RLS/`auth.uid()` are unchanged.
- **Refresh:** on-demand + cache. Fetch on dashboard open / manual refresh; cache snapshots with a TTL to limit Zerion calls.

## Data model (see `supabase/migrations/0001_init.sql`)

- `wallets` — tracked addresses (chain, address, label), unique per user.
- `manual_holdings` — manual assets with quantity + cost basis (price or purchase date).
- `balance_snapshot` — per-wallet refresh cache (total_usd + raw provider JSON).
- `holding_rows` — normalized token/DeFi line items from a snapshot, USD-valued.
- `price_cache` — shared price cache (service-role writes).
- RLS: every user-owned row keyed to `auth.uid()`.

## Adapter design

Common interface so the aggregator is source-agnostic:

```ts
interface ChainAdapter { getHoldings(address: string): Promise<HoldingRow[]> }
```

- `ZerionAdapter` (evm + solana) → tokens + DeFi from one API; `position_type === "wallet"` → token, else DeFi.
- `BitcoinAdapter` → Blockstream balance × CoinGecko BTC price.
- `ZcashAdapter` → Blockchair transparent balance × CoinGecko ZEC price.
- `ManualAdapter` → manual_holdings × current price; cost basis → unrealized P&L.

Aggregator fans out across a user's wallets + manual holdings → normalized rows →
net worth = Σ usd_value, with per-chain and per-asset breakdowns.

## Build phases

1. ✅ **Scaffold + auth + schema**: Next.js + Supabase, access-key signup/login/logout, protected dashboard, RLS migration. Boots without keys.
2. ✅ **Wallets CRUD** — add/validate/remove addresses per chain (`/wallets`).
3. ✅ **Adapters** — Bitcoin (Blockstream) + Zcash (Blockchair) + CoinGecko prices live-verified; Zerion (EVM + Solana) behind the same interface, key-gated.
4. ✅ **Aggregator + dashboard** — net worth, per-chain allocation bar, holdings table, refresh action, snapshot cache write-through (active once Supabase keys are set).
5. ⏭️ **Manual holdings** — CoinGecko search, historical cost basis, P&L.
6. **Polish** — per-source error states, allocation charts.

### Verification status
- Live-tested with real data: Bitcoin balances, CoinGecko prices, the aggregator (net worth + per-chain + graceful warnings).
- Build-verified (type-checked, not yet runtime-tested — needs keys): Supabase auth, Wallets CRUD persistence, snapshot cache, Zerion live data, dashboard with real wallets.

## Known gaps / decisions

- Solana DeFi positions are out of scope until Zerion supports `only_complex` for Solana (today it returns "not supported"); Solana tokens are covered.
- Zcash shielded funds are intentionally out of scope (transparent addresses only).
- Zerion bills per request → the cache-first refresh model is required, not optional.

## Setup

1. `cp .env.local.example .env.local` and fill Supabase keys (phase 1 only needs Supabase).
2. Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor.
3. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` — required to mint accounts at signup.
4. `bun run dev`.
