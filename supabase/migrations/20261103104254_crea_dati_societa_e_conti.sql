-- Dati della società e conti bancari (backlog 4, cap. 3 e 5; decisioni del 3 novembre 2026).
-- Per creare una società basta la ragione sociale; gli altri campi sono facoltativi ma, se
-- compilati, validi. Qui i controlli di formato; le cifre di controllo le verifica il server.
-- Niente cancellazioni: società e conti si disattivano.

alter table public.companies
  add column vat_number text check (vat_number ~ '^[0-9]{11}$'),
  add column tax_code text check (tax_code ~ '^([A-Z0-9]{16}|[0-9]{11})$'),
  add column email text check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add column address_street text check (length(trim(address_street)) > 0),
  add column address_postal_code text check (length(trim(address_postal_code)) > 0),
  add column address_city text check (length(trim(address_city)) > 0),
  add column address_province text check (length(trim(address_province)) > 0),
  add column address_country text check (address_country ~ '^[A-Z]{2}$'),
  add column is_active boolean not null default true;

create table public.company_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  label text check (length(trim(label)) > 0),
  iban text not null check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Il conto predefinito (quello del PDF) è sempre attivo.
  check (not is_default or is_active)
);

-- Un solo conto predefinito per società.
create unique index company_bank_accounts_one_default_idx
  on public.company_bank_accounts (company_id) where is_default;
create index company_bank_accounts_company_idx on public.company_bank_accounts (company_id);

create trigger company_bank_accounts_updated_at before update on public.company_bank_accounts
  for each row execute function private.set_updated_at();
create trigger company_bank_accounts_audit
  after insert or update or delete on public.company_bank_accounts
  for each row execute function private.log_change('id');

-- Il primo conto attivo di una società diventa predefinito da solo.
create function private.bank_account_default_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_default := new.is_active and not exists (
    select 1 from public.company_bank_accounts
    where company_id = new.company_id and is_default
  );
  return new;
end;
$$;

create trigger company_bank_accounts_default_on_insert
  before insert on public.company_bank_accounts
  for each row execute function private.bank_account_default_on_insert();

-- Accesso: leggono il titolare e chi è collegato alla società; scrive solo il titolare.
alter table public.company_bank_accounts enable row level security;
revoke all on public.company_bank_accounts from anon, authenticated;

grant insert on public.companies to authenticated;
grant update (
  legal_name, vat_number, tax_code, email, address_street, address_postal_code,
  address_city, address_province, address_country, is_active
) on public.companies to authenticated;

grant select on public.company_bank_accounts to authenticated;
grant insert (company_id, label, iban) on public.company_bank_accounts to authenticated;
grant update (label, iban) on public.company_bank_accounts to authenticated;

create policy companies_insert
  on public.companies for insert to authenticated
  with check ((select private.current_user_role()) = 'owner');
create policy companies_update
  on public.companies for update to authenticated
  using ((select private.current_user_role()) = 'owner')
  with check ((select private.current_user_role()) = 'owner');

create policy company_bank_accounts_select
  on public.company_bank_accounts for select to authenticated
  using (
    (select private.current_user_role()) = 'owner'
    or company_id in (select private.current_company_ids())
  );
create policy company_bank_accounts_insert
  on public.company_bank_accounts for insert to authenticated
  with check ((select private.current_user_role()) = 'owner');
create policy company_bank_accounts_update
  on public.company_bank_accounts for update to authenticated
  using ((select private.current_user_role()) = 'owner')
  with check ((select private.current_user_role()) = 'owner');

-- Predefinito e attivo si cambiano solo da queste due funzioni, che tengono le regole insieme.
create function public.set_default_bank_account(account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.company_bank_accounts;
begin
  if (select private.current_user_role()) is distinct from 'owner' then
    raise exception 'Operazione riservata al titolare' using errcode = '42501';
  end if;
  select * into account from public.company_bank_accounts where id = account_id for update;
  if not found then
    raise exception 'Conto non trovato' using errcode = 'P0002';
  end if;
  if not account.is_active then
    raise exception 'Un conto disattivato non può essere predefinito' using errcode = 'P0001';
  end if;
  update public.company_bank_accounts set is_default = false
    where company_id = account.company_id and is_default and id <> account_id;
  update public.company_bank_accounts set is_default = true where id = account_id;
end;
$$;

create function public.set_bank_account_active(account_id uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.company_bank_accounts;
begin
  if (select private.current_user_role()) is distinct from 'owner' then
    raise exception 'Operazione riservata al titolare' using errcode = '42501';
  end if;
  select * into account from public.company_bank_accounts where id = account_id for update;
  if not found then
    raise exception 'Conto non trovato' using errcode = 'P0002';
  end if;

  if active then
    update public.company_bank_accounts
    set is_active = true,
        is_default = not exists (
          select 1 from public.company_bank_accounts
          where company_id = account.company_id and is_default and id <> account_id
        )
    where id = account_id;
  else
    if account.is_default and exists (
      select 1 from public.company_bank_accounts
      where company_id = account.company_id and is_active and id <> account_id
    ) then
      raise exception 'Scegli prima un altro conto predefinito' using errcode = 'P0001';
    end if;
    update public.company_bank_accounts set is_active = false, is_default = false
      where id = account_id;
  end if;
end;
$$;

revoke all on function private.bank_account_default_on_insert() from public;
revoke execute on function public.set_default_bank_account(uuid) from public, anon;
revoke execute on function public.set_bank_account_active(uuid, boolean) from public, anon;
grant execute on function public.set_default_bank_account(uuid) to authenticated;
grant execute on function public.set_bank_account_active(uuid, boolean) to authenticated;
