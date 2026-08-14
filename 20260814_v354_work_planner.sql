-- RepairLog v3.5.4 — Rencana Kerja Teknisi
-- Jalankan setelah migrasi v3.5.3.
-- Tidak membuat tabel, kolom, kalkulasi, atau ekspor penggajian.

begin;
create extension if not exists pgcrypto;

-- Pastikan helper toko tersedia walaupun migrasi v3.5.3 dijalankan ulang.
create or replace function public.rl_v353_store_member(p_store_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.store_id::text = p_store_id
  );
$$;
revoke all on function public.rl_v353_store_member(text) from public;
grant execute on function public.rl_v353_store_member(text) to authenticated;

create or replace function public.rl_v353_store_owner(p_store_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.store_id::text = p_store_id
      and lower(coalesce(p.role, 'member')) in ('owner','admin')
  );
$$;
revoke all on function public.rl_v353_store_owner(text) from public;
grant execute on function public.rl_v353_store_owner(text) to authenticated;

create table if not exists public.technician_work_plan_items (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  plan_date date not null,
  technician_id uuid not null,
  technician_name text,
  report_id text not null,
  ticket_no text not null,
  device text,
  customer text,
  report_stage text,
  priority text not null default 'normal' check (priority in ('normal','important','urgent')),
  estimated_minutes integer not null default 60 check (estimated_minutes between 15 and 1440),
  readiness text not null default 'ready' check (readiness in ('ready','waiting_parts','waiting_customer','diagnosis','help')),
  status text not null default 'planned' check (status in ('planned','in_progress','done','carried')),
  sort_order integer not null default 10,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, plan_date, technician_id, report_id)
);

create table if not exists public.technician_work_plan_notes (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  plan_date date not null,
  technician_id uuid not null,
  author_id uuid not null,
  author_name text,
  visibility text not null default 'team' check (visibility in ('team','personal')),
  note_type text not null default 'note' check (note_type in ('note','checklist')),
  content text not null check (char_length(content) between 1 and 4000),
  linked_report_id text,
  linked_ticket_no text,
  is_completed boolean not null default false,
  sort_order integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility = 'team' or author_id = technician_id)
);

create table if not exists public.technician_work_preferences (
  store_id text not null,
  user_id uuid not null,
  daily_capacity_minutes integer not null default 480 check (daily_capacity_minutes between 60 and 960),
  specialties text[] not null default '{}',
  accent_color text not null default '#4f46e5' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  density text not null default 'comfortable' check (density in ('comfortable','compact')),
  updated_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index if not exists technician_work_plan_items_lookup_idx
  on public.technician_work_plan_items(store_id, plan_date, technician_id, sort_order);
create index if not exists technician_work_plan_items_report_idx
  on public.technician_work_plan_items(store_id, report_id, plan_date desc);
create index if not exists technician_work_plan_notes_lookup_idx
  on public.technician_work_plan_notes(store_id, plan_date, technician_id, sort_order);
create index if not exists technician_work_plan_notes_author_idx
  on public.technician_work_plan_notes(author_id, plan_date desc);

alter table public.technician_work_plan_items enable row level security;
alter table public.technician_work_plan_notes enable row level security;
alter table public.technician_work_preferences enable row level security;

-- Rencana tiket: owner dapat mengatur seluruh tim; teknisi hanya rencana sendiri.
drop policy if exists technician_work_plan_items_read on public.technician_work_plan_items;
drop policy if exists technician_work_plan_items_insert on public.technician_work_plan_items;
drop policy if exists technician_work_plan_items_update on public.technician_work_plan_items;
drop policy if exists technician_work_plan_items_delete on public.technician_work_plan_items;
create policy technician_work_plan_items_read on public.technician_work_plan_items
for select to authenticated using (
  public.rl_v353_store_member(store_id)
  and (technician_id = auth.uid() or public.rl_v353_store_owner(store_id))
);
create policy technician_work_plan_items_insert on public.technician_work_plan_items
for insert to authenticated with check (
  public.rl_v353_store_member(store_id)
  and created_by = auth.uid()
  and (technician_id = auth.uid() or public.rl_v353_store_owner(store_id))
);
create policy technician_work_plan_items_update on public.technician_work_plan_items
for update to authenticated using (
  public.rl_v353_store_member(store_id)
  and (technician_id = auth.uid() or public.rl_v353_store_owner(store_id))
) with check (
  public.rl_v353_store_member(store_id)
  and (technician_id = auth.uid() or public.rl_v353_store_owner(store_id))
);
create policy technician_work_plan_items_delete on public.technician_work_plan_items
for delete to authenticated using (
  public.rl_v353_store_member(store_id)
  and (technician_id = auth.uid() or public.rl_v353_store_owner(store_id))
);

-- Catatan tim terlihat oleh anggota toko. Catatan pribadi hanya terlihat dan dapat
-- diubah oleh pembuatnya, termasuk dari owner.
drop policy if exists technician_work_plan_notes_read on public.technician_work_plan_notes;
drop policy if exists technician_work_plan_notes_insert on public.technician_work_plan_notes;
drop policy if exists technician_work_plan_notes_update on public.technician_work_plan_notes;
drop policy if exists technician_work_plan_notes_delete on public.technician_work_plan_notes;
create policy technician_work_plan_notes_read on public.technician_work_plan_notes
for select to authenticated using (
  public.rl_v353_store_member(store_id)
  and (visibility = 'team' or author_id = auth.uid())
);
create policy technician_work_plan_notes_insert on public.technician_work_plan_notes
for insert to authenticated with check (
  public.rl_v353_store_member(store_id)
  and author_id = auth.uid()
  and (
    visibility = 'team'
    or (visibility = 'personal' and technician_id = auth.uid())
  )
);
create policy technician_work_plan_notes_update on public.technician_work_plan_notes
for update to authenticated using (
  public.rl_v353_store_member(store_id)
  and (
    author_id = auth.uid()
    or (visibility = 'team' and public.rl_v353_store_owner(store_id))
  )
) with check (
  public.rl_v353_store_member(store_id)
  and (
    (visibility = 'personal' and author_id = auth.uid() and technician_id = auth.uid())
    or visibility = 'team'
  )
);
create policy technician_work_plan_notes_delete on public.technician_work_plan_notes
for delete to authenticated using (
  public.rl_v353_store_member(store_id)
  and (
    author_id = auth.uid()
    or (visibility = 'team' and public.rl_v353_store_owner(store_id))
  )
);

-- Personalisasi dapat dibaca anggota toko agar warna/kapasitas konsisten.
drop policy if exists technician_work_preferences_read on public.technician_work_preferences;
drop policy if exists technician_work_preferences_insert on public.technician_work_preferences;
drop policy if exists technician_work_preferences_update on public.technician_work_preferences;
drop policy if exists technician_work_preferences_delete on public.technician_work_preferences;
create policy technician_work_preferences_read on public.technician_work_preferences
for select to authenticated using (public.rl_v353_store_member(store_id));
create policy technician_work_preferences_insert on public.technician_work_preferences
for insert to authenticated with check (
  public.rl_v353_store_member(store_id)
  and (user_id = auth.uid() or public.rl_v353_store_owner(store_id))
);
create policy technician_work_preferences_update on public.technician_work_preferences
for update to authenticated using (
  public.rl_v353_store_member(store_id)
  and (user_id = auth.uid() or public.rl_v353_store_owner(store_id))
) with check (
  public.rl_v353_store_member(store_id)
  and (user_id = auth.uid() or public.rl_v353_store_owner(store_id))
);
create policy technician_work_preferences_delete on public.technician_work_preferences
for delete to authenticated using (
  public.rl_v353_store_member(store_id)
  and (user_id = auth.uid() or public.rl_v353_store_owner(store_id))
);

grant select, insert, update, delete on public.technician_work_plan_items to authenticated;
grant select, insert, update, delete on public.technician_work_plan_notes to authenticated;
grant select, insert, update, delete on public.technician_work_preferences to authenticated;

-- Catat migrasi; app_version wajib pada registry RepairLog saat ini.
do $$
begin
  if to_regclass('public.rl_schema_migrations') is not null then
    insert into public.rl_schema_migrations(migration_key, app_version)
    values ('20260814_v354_work_planner', 'v3.5.4')
    on conflict (migration_key) do update set app_version = excluded.app_version;
  end if;
end $$;

commit;
