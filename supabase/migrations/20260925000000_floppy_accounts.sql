-- Apply before enabling cloud-config.mjs. No local browser data is modified.
create table if not exists public.floppy_collections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.floppy_collections enable row level security;
revoke all on public.floppy_collections from anon, authenticated;
grant select on public.floppy_collections to authenticated;
create policy "owner reads own Floppy collection" on public.floppy_collections
  for select to authenticated using ((select auth.uid()) = owner_id);

-- Atomic compare-and-swap protects the whole current collection from stale tabs.
-- The database, not a client-supplied owner ID, chooses the account row.
create or replace function public.save_floppy_collection(expected_revision bigint, next_snapshot jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := (select auth.uid());
  new_revision bigint;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if expected_revision < 0 or next_snapshot->>'version' <> '4'
     or jsonb_typeof(next_snapshot->'projects') <> 'array'
     or jsonb_typeof(next_snapshot->'active') <> 'string'
     or pg_catalog.pg_column_size(next_snapshot) > 8 * 1024 * 1024 then
    raise exception 'Invalid or oversized collection' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.floppy_collections (owner_id, snapshot, revision)
    values (caller, next_snapshot, 1)
    on conflict (owner_id) do nothing returning revision into new_revision;
  else
    update public.floppy_collections
       set snapshot = next_snapshot, revision = revision + 1, updated_at = now()
     where owner_id = caller and revision = expected_revision
     returning revision into new_revision;
  end if;
  if new_revision is null then raise exception 'Collection conflict' using errcode = '40001'; end if;
  return new_revision;
end $$;
revoke all on function public.save_floppy_collection(bigint,jsonb) from public, anon;
grant execute on function public.save_floppy_collection(bigint,jsonb) to authenticated;

-- Ciphertext only; the wrapping secret lives solely in Edge Function secrets.
create table if not exists public.floppy_gemini_keys (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  nonce text not null,
  last_four text not null check (length(last_four) = 4),
  updated_at timestamptz not null default now()
);
alter table public.floppy_gemini_keys enable row level security;
revoke all on public.floppy_gemini_keys from anon, authenticated;
-- Edge Function uses a server-side secret key, and never returns ciphertext or plaintext.
