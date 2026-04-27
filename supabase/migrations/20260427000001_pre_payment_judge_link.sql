-- ============================================================
-- Pre-payment judge links
-- ============================================================

alter table public.vows
  add column if not exists witness_share_locked_at timestamptz,
  add column if not exists witness_share_method text
    check (witness_share_method in ('share','copy','contact')),
  add column if not exists terms_hash text,
  add column if not exists superseded_by_vow_id uuid references public.vows(id);

create index if not exists idx_vows_terms_hash
  on public.vows(terms_hash)
  where terms_hash is not null;

create index if not exists idx_vows_superseded_by_vow_id
  on public.vows(superseded_by_vow_id)
  where superseded_by_vow_id is not null;

