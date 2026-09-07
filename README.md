# Pango

A crypto portfolio tracker. Sign in with a generated access key, add wallet
addresses across chains, and see a unified net worth — tokens, DeFi positions,
and prices in one dashboard.

## Features

- **Access-key auth** — one random key is your only credential. No email, no
  password. The raw key is never stored, so keep it safe (lose it = lose the account).
- **Multi-chain wallets** — track EVM, Solana, Bitcoin, and Zcash (transparent) addresses.
- **Manual tokens** — search CoinGecko, enter quantity or USD spent, and use a buy
  price or historical buy date. View current value, cost, and unrealized gain/loss.
- **Unified dashboard** — net worth, per-chain allocation, and a holdings table,
  with cached snapshots and on-demand refresh.

## Data sources

| Data | Source | Key |
| --- | --- | --- |
| EVM + Solana tokens & DeFi | Zerion | `ZERION_API_KEY` (else skipped) |
| Bitcoin balances | Blockstream Esplora | none |
| Zcash transparent | Blockchair | `BLOCKCHAIR_API_KEY` (optional) |
| Token search, manual token details, current/historical USD prices | CoinGecko | `COINGECKO_API_KEY` (optional demo key) |

## Stack

Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres + RLS) · Bun.

## Setup

```bash
cp .env.local.example .env.local   # fill in Supabase keys
bun install
bun run dev                         # http://localhost:3000
```

Then, in the Supabase SQL editor, run `supabase/migrations/0001_init.sql`.

### Required environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; mints accounts at signup |

Chain/price API keys (see `.env.local.example`) are optional — Bitcoin and
prices work keyless; without `ZERION_API_KEY`, EVM and Solana are skipped.

## Scripts

Manual tokens use the existing `manual_holdings` table and owner-only RLS from
`0001_init.sql`; no additional migration is needed. Open **Tokens**, search and
select the exact CoinGecko asset, then choose quantity or USD spent and buy price
or buy date. USD spent is divided by the buy price to derive quantity (fees excluded).
Buy dates use CoinGecko’s daily historical USD price, not the actual execution price.
Historical availability depends on the API plan and asset; enter the buy price
if lookup fails. Current manual prices use a five-minute cache in the existing
`price_cache` table (service-role writes), with an in-memory fallback. Dashboard
Refresh bypasses the cache. Failed refreshes keep the last saved price and show
its timestamp; tokens without any available price remain visible and are excluded
from net worth. Manual tokens are additive: do not
enter assets already tracked by a wallet.

CoinGecko references: [search](https://docs.coingecko.com/reference/search-data),
[markets](https://docs.coingecko.com/reference/coins-markets),
[history](https://docs.coingecko.com/reference/coins-id-history).

| Command | Description |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | Lint |

## Known gaps & decisions

- Solana DeFi positions are out of scope until Zerion supports them (it currently
  returns "not supported"); Solana tokens are covered.
- Zcash shielded funds are intentionally out of scope — transparent addresses only.
- Zerion bills per request, so the cache-first refresh model is required, not optional.
