-- Pango initial schema + row-level security.
-- Run in the Supabase SQL editor, or via `supabase db push` once the CLI is linked.
-- Auth users live in Supabase's managed `auth.users` table; we reference auth.uid().

-- ---------- enums ----------
create type chain_kind as enum ('evm', 'solana', 'bitcoin', 'zcash');
create type holding_kind as enum ('token', 'defi');

-- ---------- wallets ----------
-- Addresses the user wants tracked. (address, chain) unique per user.
create table public.wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  chain       chain_kind not null,
  address     text not null,
  label       text,
  created_at  timestamptz not null default now(),
  unique (user_id, chain, address)
);
create index wallets_user_idx on public.wallets (user_id);

-- ---------- manual holdings ----------
-- Manually entered assets with optional cost basis (price or purchase date).
create table public.manual_holdings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  coingecko_id     text not null,            -- e.g. 'bitcoin', 'ethereum'
  symbol           text not null,
  quantity         numeric not null check (quantity >= 0),
  cost_basis_price numeric,                  -- USD per unit at acquisition (optional)
  cost_basis_date  date,                     -- used to look up historical price if no price given
  note             text,
  created_at       timestamptz not null default now()
);
create index manual_holdings_user_idx on public.manual_holdings (user_id);

-- ---------- balance snapshots (cache) ----------
-- One row per wallet refresh; powers the on-demand + cache strategy.
create table public.balance_snapshot (
  id          uuid primary key default gen_random_uuid(),
  wallet_id   uuid not null references public.wallets (id) on delete cascade,
  fetched_at  timestamptz not null default now(),
  total_usd   numeric not null default 0,
  raw_json    jsonb                            -- raw provider payload for debugging/reprocessing
);
create index balance_snapshot_wallet_idx on public.balance_snapshot (wallet_id, fetched_at desc);

-- ---------- normalized holding rows ----------
-- Flattened line items from a snapshot (tokens + DeFi positions), all USD-valued.
create table public.holding_rows (
  id          uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.balance_snapshot (id) on delete cascade,
  kind        holding_kind not null,
  chain       chain_kind not null,
  symbol      text,
  name        text,
  protocol    text,                            -- for DeFi rows
  amount      numeric,
  price_usd   numeric,
  usd_value   numeric not null default 0
);
create index holding_rows_snapshot_idx on public.holding_rows (snapshot_id);

-- ---------- price cache ----------
-- Shared across users; not user-scoped, so kept readable but writable only by service role.
create table public.price_cache (
  asset_key   text primary key,                -- coingecko id or solana mint
  price_usd   numeric not null,
  fetched_at  timestamptz not null default now()
);

-- ================= Row Level Security =================
alter table public.wallets          enable row level security;
alter table public.manual_holdings  enable row level security;
alter table public.balance_snapshot enable row level security;
alter table public.holding_rows     enable row level security;
alter table public.price_cache      enable row level security;

-- wallets: owner-only full access
create policy "wallets are private to owner"
  on public.wallets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- manual_holdings: owner-only full access
create policy "manual holdings are private to owner"
  on public.manual_holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- balance_snapshot: access via owning wallet
create policy "snapshots readable by wallet owner"
  on public.balance_snapshot for select
  using (
    exists (
      select 1 from public.wallets w
      where w.id = balance_snapshot.wallet_id and w.user_id = auth.uid()
    )
  );

-- holding_rows: access via the snapshot's owning wallet
create policy "holding rows readable by wallet owner"
  on public.holding_rows for select
  using (
    exists (
      select 1
      from public.balance_snapshot s
      join public.wallets w on w.id = s.wallet_id
      where s.id = holding_rows.snapshot_id and w.user_id = auth.uid()
    )
  );

-- price_cache: anyone authenticated may read; writes happen server-side via service role
create policy "price cache is readable"
  on public.price_cache for select
  using (true);

-- NOTE: balance_snapshot / holding_rows / price_cache writes are performed by the
-- server using the service-role key (which bypasses RLS), so no INSERT/UPDATE
-- policies are defined for the anon/auth role on purpose.
