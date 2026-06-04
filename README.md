# Pango

A crypto portfolio tracker. Sign in with a generated access key, add wallet
addresses across chains, and see a unified net worth — tokens, DeFi positions,
and prices in one dashboard.

## Features

- **Access-key auth** — one random key is your only credential. No email, no
  password. The raw key is never stored, so keep it safe (lose it = lose the account).
- **Multi-chain wallets** — track EVM, Solana, Bitcoin, and Zcash (transparent) addresses.
- **Unified dashboard** — net worth, per-chain allocation, and a holdings table,
  with cached snapshots and on-demand refresh.

## Data sources

| Data | Source | Key |
| --- | --- | --- |
| EVM + Solana tokens & DeFi | Zerion | `ZERION_API_KEY` (else skipped) |
| Bitcoin balances | Blockstream Esplora | none |
| Zcash transparent | Blockchair | `BLOCKCHAIR_API_KEY` (optional) |
| Prices (BTC/ZEC) | CoinGecko | `COINGECKO_API_KEY` (optional) |

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

| Command | Description |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run lint` | Lint |

See [`PLAN.md`](./PLAN.md) for architecture, data model, and adapter design.
