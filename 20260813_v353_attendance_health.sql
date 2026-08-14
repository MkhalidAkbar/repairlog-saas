-- RepairLog v3.5.3 — Absensi Lanjutan, Monitoring Error & Kesehatan
-- Jalankan sekali melalui Supabase SQL Editor.
-- Tidak membuat tabel, kolom, atau proses penggajian.

begin;
create extension if not exists pgcrypto;

-- Peran dipakai hanya untuk membedakan owner/admin pada fitur absensi lanjutan.
alter table if exists public.profiles add column if not exists role text not null default 'member';

create table if not exists public.attendance_settings (
  store_id text primary key,
  default_shift text not null default 'Pagi',
  late_tolerance_minutes integer not null default 10 check (late_tolerance_minutes between 0 and 120),
  geofence_enabled boolean not null default false,
  geofence_lat double precision,
  geofence_lng double precision,
  geofence_radius_m integer not null default 150 check (geofence_radius_m between 25 and 5000),
  photo_enabled boolean not null default true,
  shift_templates jsonb not null default '[{"name":"Pagi","start":"08:00","end":"17:00"},{"name":"Siang","start":"12:00","end":"20:00"}]'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_schedules (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  user_id uuid not null,
  user_name text,
  work_date date not null,
  shift_name text not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id, work_date)
);

create table if not exists public.attendance_details (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  attendance_id text not null unique,
  user_id uuid not null,
  schedule_id uuid references public.attendance_schedules(id) on delete set null,
  shift_name text,
  scheduled_start time,
  scheduled_end time,
  late_minutes integer not null default 0 check (late_minutes >= 0),
  check_in_lat double precision,
  check_in_lng double precision,
  check_in_accuracy double precision,
  check_out_lat double precision,
  check_out_lng double precision,
  check_out_accuracy double precision,
  check_in_photo_path text,
  check_in_photo_url text,
  check_in_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_requests (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  user_id uuid not null,
  user_name text,
  request_type text not null check (request_type in ('leave','correction')),
  category text not null check (category in ('izin','sakit','cuti','koreksi')),
  attendance_id text,
  start_date date not null,
  end_date date not null,
  proposed_check_in time,
  proposed_check_out time,
  reason text not null,
  evidence_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.app_issue_reports (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  user_id uuid,
  user_name text,
  title text not null,
  description text not null,
  page text,
  app_version text,
  diagnostics jsonb not null default '{}'::jsonb,
  screenshot_path text,
  screenshot_url text,
  status text not null default 'open' check (status in ('open','investigating','resolved','closed')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists attendance_schedules_store_date_idx on public.attendance_schedules(store_id, work_date desc);
create index if not exists attendance_schedules_user_date_idx on public.attendance_schedules(user_id, work_date desc);
create index if not exists attendance_details_store_created_idx on public.attendance_details(store_id, created_at desc);
create index if not exists attendance_details_user_idx on public.attendance_details(user_id, created_at desc);
create index if not exists attendance_requests_store_status_idx on public.attendance_requests(store_id, status, created_at desc);
create index if not exists attendance_requests_user_idx on public.attendance_requests(user_id, created_at desc);
create index if not exists app_issue_reports_store_status_idx on public.app_issue_reports(store_id, status, created_at desc);

-- Helper: akun harus terdaftar pada toko yang sama.
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
      and lower(coalesce(p.role, 'member')) in ('owner', 'admin')
  );
$$;
revoke all on function public.rl_v353_store_owner(text) from public;
grant execute on function public.rl_v353_store_owner(text) to authenticated;

alter table public.attendance_settings enable row level security;
alter table public.attendance_schedules enable row level security;
alter table public.attendance_details enable row level security;
alter table public.attendance_requests enable row level security;
alter table public.app_issue_reports enable row level security;

-- Hak keputusan dan pengaturan ditegakkan kembali di database.
drop policy if exists attendance_settings_store_member on public.attendance_settings;
drop policy if exists attendance_settings_read on public.attendance_settings;
drop policy if exists attendance_settings_owner_manage on public.attendance_settings;
create policy attendance_settings_read on public.attendance_settings for select to authenticated
using (public.rl_v353_store_member(store_id));
create policy attendance_settings_owner_manage on public.attendance_settings for all to authenticated
using (public.rl_v353_store_owner(store_id)) with check (public.rl_v353_store_owner(store_id));

drop policy if exists attendance_schedules_store_member on public.attendance_schedules;
drop policy if exists attendance_schedules_read on public.attendance_schedules;
drop policy if exists attendance_schedules_owner_manage on public.attendance_schedules;
create policy attendance_schedules_read on public.attendance_schedules for select to authenticated
using (public.rl_v353_store_member(store_id));
create policy attendance_schedules_owner_manage on public.attendance_schedules for all to authenticated
using (public.rl_v353_store_owner(store_id)) with check (public.rl_v353_store_owner(store_id));

drop policy if exists attendance_details_store_member on public.attendance_details;
drop policy if exists attendance_details_read on public.attendance_details;
drop policy if exists attendance_details_insert_own on public.attendance_details;
drop policy if exists attendance_details_update_own on public.attendance_details;
create policy attendance_details_read on public.attendance_details for select to authenticated
using (public.rl_v353_store_member(store_id));
create policy attendance_details_insert_own on public.attendance_details for insert to authenticated
with check (public.rl_v353_store_member(store_id) and (user_id = auth.uid() or public.rl_v353_store_owner(store_id)));
create policy attendance_details_update_own on public.attendance_details for update to authenticated
using (public.rl_v353_store_member(store_id) and (user_id = auth.uid() or public.rl_v353_store_owner(store_id)))
with check (public.rl_v353_store_member(store_id) and (user_id = auth.uid() or public.rl_v353_store_owner(store_id)));

drop policy if exists attendance_requests_store_member on public.attendance_requests;
drop policy if exists attendance_requests_insert_own on public.attendance_requests;
drop policy if exists attendance_requests_update_store_member on public.attendance_requests;
drop policy if exists attendance_requests_read on public.attendance_requests;
drop policy if exists attendance_requests_update_allowed on public.attendance_requests;
create policy attendance_requests_read on public.attendance_requests for select to authenticated
using (public.rl_v353_store_member(store_id) and (user_id = auth.uid() or public.rl_v353_store_owner(store_id)));
create policy attendance_requests_insert_own on public.attendance_requests for insert to authenticated
with check (public.rl_v353_store_member(store_id) and user_id = auth.uid() and status = 'pending');
create policy attendance_requests_update_allowed on public.attendance_requests for update to authenticated
using (public.rl_v353_store_member(store_id) and (public.rl_v353_store_owner(store_id) or (user_id = auth.uid() and status = 'pending')))
with check (public.rl_v353_store_member(store_id) and (public.rl_v353_store_owner(store_id) or (user_id = auth.uid() and status in ('pending','cancelled'))));

drop policy if exists app_issue_reports_store_member on public.app_issue_reports;
drop policy if exists app_issue_reports_insert_own on public.app_issue_reports;
drop policy if exists app_issue_reports_update_store_member on public.app_issue_reports;
drop policy if exists app_issue_reports_read on public.app_issue_reports;
drop policy if exists app_issue_reports_owner_update on public.app_issue_reports;
create policy app_issue_reports_read on public.app_issue_reports for select to authenticated
using (public.rl_v353_store_member(store_id) and (user_id = auth.uid() or public.rl_v353_store_owner(store_id)));
create policy app_issue_reports_insert_own on public.app_issue_reports for insert to authenticated
with check (public.rl_v353_store_member(store_id) and (user_id is null or user_id = auth.uid()));
create policy app_issue_reports_owner_update on public.app_issue_reports for update to authenticated
using (public.rl_v353_store_owner(store_id)) with check (public.rl_v353_store_owner(store_id));

grant select, insert, update, delete on public.attendance_settings to authenticated;
grant select, insert, update, delete on public.attendance_schedules to authenticated;
grant select, insert, update, delete on public.attendance_details to authenticated;
grant select, insert, update on public.attendance_requests to authenticated;
grant select, insert, update on public.app_issue_reports to authenticated;

-- Catat migrasi bila registry dari rilis sebelumnya tersedia.
do $$
begin
  if to_regclass('public.rl_schema_migrations') is not null then
    insert into public.rl_schema_migrations(migration_key, app_version)
    values ('20260813_v353_attendance_health', 'v3.5.3')
    on conflict (migration_key) do update set app_version = excluded.app_version;
  end if;
end $$;

commit;
