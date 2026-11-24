-- Pain Tracker — integration-ready Supabase schema (NOT applied in the demo).
-- Before storing real patient data: complete a security & compliance assessment, sign a BAA
-- with the hosting provider, enable MFA on Supabase Auth, and review these policies with security staff.

create type app_role as enum ('patient', 'caregiver', 'clinician');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role app_role not null default 'patient',
  goals text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Explicit, revocable sharing from a patient to a caregiver or clinician.
create table public.care_access (
  patient_id uuid not null references public.profiles (id) on delete cascade,
  grantee_id uuid not null references public.profiles (id) on delete cascade,
  can_write boolean not null default false,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (patient_id, grantee_id)
);

create table public.consents (
  id bigserial primary key,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  version int not null,
  accepted_at timestamptz not null default now(),
  details jsonb not null
);

-- One table per collection; the record itself is JSONB so the client model can evolve during a pilot.
do $$
declare t text;
begin
  foreach t in array array['pain_entries','medications','dose_records','injection_records','exercise_sessions','meal_entries','appointments','reminders'] loop
    execute format($f$
      create table public.%1$I (
        id text not null,
        patient_id uuid not null references public.profiles (id) on delete cascade,
        payload jsonb not null,
        updated_at timestamptz not null default now(),
        primary key (patient_id, id)
      );
      alter table public.%1$I enable row level security;

      -- Patients own their rows.
      create policy "%1$s owner all" on public.%1$I for all
        using (patient_id = auth.uid()) with check (patient_id = auth.uid());

      -- Active grantees may read.
      create policy "%1$s grantee read" on public.%1$I for select using (exists (
        select 1 from public.care_access a where a.patient_id = %1$I.patient_id and a.grantee_id = auth.uid() and a.revoked_at is null));

      -- Grantees with write access may insert/update, never delete (patients alone delete).
      create policy "%1$s grantee insert" on public.%1$I for insert with check (exists (
        select 1 from public.care_access a where a.patient_id = %1$I.patient_id and a.grantee_id = auth.uid() and a.can_write and a.revoked_at is null));
      create policy "%1$s grantee update" on public.%1$I for update using (exists (
        select 1 from public.care_access a where a.patient_id = %1$I.patient_id and a.grantee_id = auth.uid() and a.can_write and a.revoked_at is null));
    $f$, t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "profile self" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
alter table public.care_access enable row level security;
create policy "access patient manages" on public.care_access for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "access grantee reads" on public.care_access for select using (grantee_id = auth.uid());
alter table public.consents enable row level security;
create policy "consent self" on public.consents for all using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- Deleting the auth user cascades to every patient row (right to deletion).
-- Add audit logging (e.g. pgaudit or trigger-based) before production use.
