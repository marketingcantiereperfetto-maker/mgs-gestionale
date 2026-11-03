-- Profili utente, ruoli e collegamento alle società (cap. 20).
-- I 5 ruoli sono modelli forniti dal software (decisione del 2 novembre 2026).

create type public.user_role as enum (
  'owner',
  'sales_manager',
  'sales_consultant',
  'catalog_admin',
  'finance_admin'
);

-- Anagrafica minima: i dati completi della società arrivano con le Impostazioni (backlog 4).
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(trim(legal_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_companies (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create index profile_companies_company_idx on public.profile_companies (company_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies
  for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger companies_audit after insert or update or delete on public.companies
  for each row execute function private.log_change('id');
create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function private.log_change('user_id');
create trigger profile_companies_audit after insert or update or delete on public.profile_companies
  for each row execute function private.log_change('user_id');

-- Funzioni usate dalle regole RLS: leggono il profilo dell'utente collegato.
create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = auth.uid() and is_active;
$$;

create function private.current_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pc.company_id
  from public.profile_companies pc
  join public.profiles p on p.user_id = pc.user_id
  where pc.user_id = auth.uid() and p.is_active;
$$;

grant usage on schema private to authenticated;
revoke all on function private.current_user_role() from public;
revoke all on function private.current_company_ids() from public;
revoke all on function private.set_updated_at() from public;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.current_company_ids() to authenticated;

-- RLS di base: per ora solo lettura dall'app; le scritture passano dal server.
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_companies enable row level security;

revoke all on public.companies from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.profile_companies from anon, authenticated;
grant select on public.companies to authenticated;
grant select on public.profiles to authenticated;
grant select on public.profile_companies to authenticated;

create policy companies_select on public.companies for select to authenticated
  using (
    (select private.current_user_role()) = 'owner'
    or id in (select private.current_company_ids())
  );

create policy profiles_select on public.profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.current_user_role()) = 'owner'
  );

create policy profile_companies_select on public.profile_companies for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.current_user_role()) = 'owner'
  );

create policy audit_log_select on public.audit_log for select to authenticated
  using ((select private.current_user_role()) in ('owner', 'finance_admin'));
