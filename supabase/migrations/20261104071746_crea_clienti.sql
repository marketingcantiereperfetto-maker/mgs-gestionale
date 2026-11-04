-- Anagrafica clienti predisposta alla fatturazione elettronica (backlog 5, cap. 16.2 e 16.3;
-- decisioni del 4 novembre 2026). Per salvare basta il nome; gli altri campi sono facoltativi
-- ma, se compilati, nel formato giusto (le cifre di controllo le verifica il server).
-- Nessuna cancellazione: un cliente si disattiva.

create type public.customer_subject_type as enum (
  'company',
  'professional',
  'private',
  'public_administration',
  'foreign'
);

create type public.vat_regime as enum (
  'ordinary',
  'exempt',
  'reverse_charge',
  'intent_declaration'
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200 and name = btrim(name)),
  subject_type public.customer_subject_type,
  vat_number text check (vat_number ~ '^[0-9]{11}$'),
  tax_code text check (tax_code ~ '^([A-Z0-9]{16}|[0-9]{11})$'),
  foreign_tax_id text check (char_length(foreign_tax_id) between 1 and 40 and foreign_tax_id = btrim(foreign_tax_id)),
  address_street text check (length(btrim(address_street)) > 0),
  address_postal_code text check (length(btrim(address_postal_code)) > 0),
  address_city text check (length(btrim(address_city)) > 0),
  address_province text check (length(btrim(address_province)) > 0),
  address_country text check (address_country ~ '^[A-Z]{2}$'),
  sdi_code text check (sdi_code ~ '^[A-Z0-9]{7}$'),
  pec text check (pec ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  pa_office_code text check (pa_office_code ~ '^[A-Z0-9]{6}$'),
  pa_office_name text check (length(btrim(pa_office_name)) > 0),
  -- Split payment: vuoto finché non si sceglie sì o no.
  split_payment boolean,
  vat_regime public.vat_regime,
  vat_exemption_nature text check (length(btrim(vat_exemption_nature)) > 0),
  intent_declaration_number text check (length(btrim(intent_declaration_number)) > 0),
  intent_declaration_date date,
  -- Cliente che è una società del gruppo (vendite interne escluse dal conto di Gruppo, §25.4).
  group_company_id uuid references public.companies (id) on delete restrict,
  is_active boolean not null default true,
  creation_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers (lower(name));
create index customers_group_company_idx on public.customers (group_company_id);

create trigger customers_updated_at before update on public.customers
  for each row execute function private.set_updated_at();
create trigger customers_audit after insert or update or delete on public.customers
  for each row execute function private.log_change('id');

-- Ruoli con accesso ai clienti: l'amministrazione cataloghi non ne ha.
create function private.can_use_customers()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_user_role()) in
    ('owner', 'sales_manager', 'sales_consultant', 'finance_admin'), false);
$$;

revoke all on function private.can_use_customers() from public;
grant execute on function private.can_use_customers() to authenticated;

-- Facoltà ristrette dentro la riga: attivo sì/no (titolare e responsabile commerciale) e società
-- del gruppo (titolare e amministrazione economica).
create function private.check_customer_restricted_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  role public.user_role := (select private.current_user_role());
begin
  if tg_op = 'INSERT' then
    if new.is_active is distinct from true and role not in ('owner', 'sales_manager') then
      raise exception 'Solo titolare e responsabile commerciale disattivano i clienti' using errcode = '42501';
    end if;
    if new.group_company_id is not null and role not in ('owner', 'finance_admin') then
      raise exception 'Solo titolare e amministrazione economica indicano la società del gruppo' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.is_active is distinct from old.is_active and role not in ('owner', 'sales_manager') then
    raise exception 'Solo titolare e responsabile commerciale disattivano i clienti' using errcode = '42501';
  end if;
  if new.group_company_id is distinct from old.group_company_id
    and role not in ('owner', 'finance_admin') then
    raise exception 'Solo titolare e amministrazione economica indicano la società del gruppo' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.check_customer_restricted_fields() from public;

create trigger customers_restricted_fields before insert or update on public.customers
  for each row execute function private.check_customer_restricted_fields();

alter table public.customers enable row level security;
revoke all on public.customers from anon, authenticated;

grant select on public.customers to authenticated;
grant insert (
  name, subject_type, vat_number, tax_code, foreign_tax_id, address_street, address_postal_code,
  address_city, address_province, address_country, sdi_code, pec, pa_office_code,
  pa_office_name, split_payment, vat_regime, vat_exemption_nature, intent_declaration_number,
  intent_declaration_date, group_company_id, creation_key
) on public.customers to authenticated;
grant update (
  name, subject_type, vat_number, tax_code, foreign_tax_id, address_street, address_postal_code,
  address_city, address_province, address_country, sdi_code, pec, pa_office_code,
  pa_office_name, split_payment, vat_regime, vat_exemption_nature, intent_declaration_number,
  intent_declaration_date, group_company_id, is_active
) on public.customers to authenticated;

create policy customers_select on public.customers for select to authenticated
  using ((select private.can_use_customers()));
create policy customers_insert on public.customers for insert to authenticated
  with check ((select private.can_use_customers()));
create policy customers_update on public.customers for update to authenticated
  using ((select private.can_use_customers()))
  with check ((select private.can_use_customers()));
