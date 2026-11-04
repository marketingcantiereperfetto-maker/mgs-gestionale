-- Referenti e indirizzi di consegna dei clienti (clienti B, cap. 16.2 «Uso commerciale»;
-- decisioni del 4 novembre 2026). Più di uno per cliente, uno principale/predefinito, nessuna
-- cancellazione: si disattivano. Stessi ruoli dei clienti; disattivano e riattivano solo
-- titolare e responsabile commerciale. Il registro non salva mai dati personali.

-- Referenti -------------------------------------------------------------------------------------

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120 and name = btrim(name)),
  role text check (char_length(role) between 1 and 80 and role = btrim(role)),
  email text check (
    char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  -- Cifre, spazi, «+» iniziale, trattini, parentesi, punti e barre; almeno 6 cifre.
  phone text check (
    char_length(phone) <= 40
    and phone ~ '^\+?[0-9 ()./-]+$'
    and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 6 and 20
  ),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  creation_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Il referente principale è sempre attivo.
  check (not is_primary or is_active)
);

create unique index customer_contacts_one_primary_idx
  on public.customer_contacts (customer_id) where is_primary;
create index customer_contacts_customer_idx on public.customer_contacts (customer_id);
create index customer_contacts_email_idx on public.customer_contacts (lower(email)) where is_active;

-- Indirizzi di consegna -------------------------------------------------------------------------

create table public.customer_delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  description text check (
    char_length(description) between 1 and 120 and description = btrim(description)
  ),
  street text not null check (char_length(btrim(street)) between 1 and 200),
  postal_code text check (char_length(btrim(postal_code)) between 1 and 20),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  province text check (char_length(btrim(province)) between 1 and 60),
  country text not null check (country ~ '^[A-Z]{2}$'),
  is_default boolean not null default false,
  is_active boolean not null default true,
  creation_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_default or is_active),
  -- In Italia CAP di 5 cifre e provincia di 2 lettere, se compilati.
  check (country <> 'IT' or postal_code is null or postal_code ~ '^[0-9]{5}$'),
  check (country <> 'IT' or province is null or province ~ '^[A-Z]{2}$')
);

create unique index customer_delivery_addresses_one_default_idx
  on public.customer_delivery_addresses (customer_id) where is_default;
create index customer_delivery_addresses_customer_idx
  on public.customer_delivery_addresses (customer_id);

create trigger customer_contacts_updated_at before update on public.customer_contacts
  for each row execute function private.set_updated_at();
create trigger customer_delivery_addresses_updated_at
  before update on public.customer_delivery_addresses
  for each row execute function private.set_updated_at();

-- Il cliente di un referente o di un indirizzo non cambia dopo la creazione (anche per gli
-- strumenti di amministrazione: oltre al permesso di colonna, un controllo sulla riga).
create function private.keep_customer_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.customer_id is distinct from old.customer_id then
    raise exception 'Il cliente collegato non si può cambiare' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.keep_customer_link() from public;

create trigger customer_contacts_keep_link before update on public.customer_contacts
  for each row execute function private.keep_customer_link();
create trigger customer_delivery_addresses_keep_link
  before update on public.customer_delivery_addresses
  for each row execute function private.keep_customer_link();

-- Il primo referente attivo diventa principale, il primo indirizzo attivo predefinito.
create function private.customer_contact_primary_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_primary := new.is_active and not exists (
    select 1 from public.customer_contacts where customer_id = new.customer_id and is_primary
  );
  return new;
end;
$$;

create function private.customer_address_default_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.is_default := new.is_active and not exists (
    select 1 from public.customer_delivery_addresses
    where customer_id = new.customer_id and is_default
  );
  return new;
end;
$$;

revoke all on function private.customer_contact_primary_on_insert() from public;
revoke all on function private.customer_address_default_on_insert() from public;

create trigger customer_contacts_primary_on_insert before insert on public.customer_contacts
  for each row execute function private.customer_contact_primary_on_insert();
create trigger customer_delivery_addresses_default_on_insert
  before insert on public.customer_delivery_addresses
  for each row execute function private.customer_address_default_on_insert();

-- Registro senza dati personali: solo id, id del cliente, stato attivo e i NOMI dei campi
-- cambiati (alla creazione e alla cancellazione: dei campi compilati). Né il nome del
-- referente né la descrizione dell'indirizzo: anche quelli possono essere dati personali.
create function private.log_customer_detail_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  technical constant text[] := array[
    'id', 'customer_id', 'is_active', 'creation_key', 'created_at', 'updated_at'
  ];
  source jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  fields text[];
  snapshot_old jsonb;
  snapshot_new jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}')
      into fields
      from jsonb_each(to_jsonb(new)) as current_row(key, value)
      where key <> all (technical)
        and value is distinct from (to_jsonb(old) -> key);
  else
    select coalesce(array_agg(key order by key), '{}')
      into fields
      from jsonb_each(source) as current_row(key, value)
      where key <> all (technical) and value <> 'null'::jsonb and value <> 'false'::jsonb;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    snapshot_old := jsonb_build_object(
      'id', old.id, 'customer_id', old.customer_id, 'is_active', old.is_active
    );
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    snapshot_new := jsonb_build_object(
      'id', new.id, 'customer_id', new.customer_id, 'is_active', new.is_active,
      'changed_fields', to_jsonb(fields)
    );
  else
    snapshot_old := snapshot_old || jsonb_build_object('changed_fields', to_jsonb(fields));
  end if;

  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, source ->> 'id', lower(tg_op), snapshot_old, snapshot_new);
  return null;
end;
$$;

revoke all on function private.log_customer_detail_change() from public;

create trigger customer_contacts_audit after insert or update or delete on public.customer_contacts
  for each row execute function private.log_customer_detail_change();
create trigger customer_delivery_addresses_audit
  after insert or update or delete on public.customer_delivery_addresses
  for each row execute function private.log_customer_detail_change();

-- Permessi: come i clienti. Principale/predefinito e attivo solo dalle funzioni qui sotto.
alter table public.customer_contacts enable row level security;
alter table public.customer_delivery_addresses enable row level security;
revoke all on public.customer_contacts from anon, authenticated;
revoke all on public.customer_delivery_addresses from anon, authenticated;

grant select on public.customer_contacts to authenticated;
grant insert (customer_id, name, role, email, phone, creation_key)
  on public.customer_contacts to authenticated;
grant update (name, role, email, phone) on public.customer_contacts to authenticated;

grant select on public.customer_delivery_addresses to authenticated;
grant insert (customer_id, description, street, postal_code, city, province, country, creation_key)
  on public.customer_delivery_addresses to authenticated;
grant update (description, street, postal_code, city, province, country)
  on public.customer_delivery_addresses to authenticated;

create policy customer_contacts_select on public.customer_contacts for select to authenticated
  using ((select private.can_use_customers()));
create policy customer_contacts_insert on public.customer_contacts for insert to authenticated
  with check ((select private.can_use_customers()));
create policy customer_contacts_update on public.customer_contacts for update to authenticated
  using ((select private.can_use_customers()))
  with check ((select private.can_use_customers()));

create policy customer_delivery_addresses_select on public.customer_delivery_addresses
  for select to authenticated using ((select private.can_use_customers()));
create policy customer_delivery_addresses_insert on public.customer_delivery_addresses
  for insert to authenticated with check ((select private.can_use_customers()));
create policy customer_delivery_addresses_update on public.customer_delivery_addresses
  for update to authenticated
  using ((select private.can_use_customers()))
  with check ((select private.can_use_customers()));

-- Referente principale: lo sceglie chi modifica i clienti.
create function public.set_primary_customer_contact(contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact public.customer_contacts;
begin
  if not (select private.can_use_customers()) then
    raise exception 'Operazione non consentita' using errcode = '42501';
  end if;
  select * into contact from public.customer_contacts where id = contact_id for update;
  if not found then
    raise exception 'Referente non trovato' using errcode = 'P0002';
  end if;
  if not contact.is_active then
    raise exception 'Un referente disattivato non può essere il principale' using errcode = 'P0001';
  end if;
  update public.customer_contacts set is_primary = false
    where customer_id = contact.customer_id and is_primary and id <> contact_id;
  update public.customer_contacts set is_primary = true where id = contact_id;
end;
$$;

-- Attivo sì/no: solo titolare e responsabile commerciale. Il principale non si disattiva finché
-- ci sono altri referenti attivi; un referente riattivato diventa principale se non ce n'è uno.
create function public.set_customer_contact_active(contact_id uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact public.customer_contacts;
begin
  if (select private.current_user_role()) is null
    or (select private.current_user_role()) not in ('owner', 'sales_manager') then
    raise exception 'Solo titolare e responsabile commerciale disattivano i referenti' using errcode = '42501';
  end if;
  select * into contact from public.customer_contacts where id = contact_id for update;
  if not found then
    raise exception 'Referente non trovato' using errcode = 'P0002';
  end if;

  if active then
    update public.customer_contacts
    set is_active = true,
        is_primary = not exists (
          select 1 from public.customer_contacts
          where customer_id = contact.customer_id and is_primary and id <> contact_id
        )
    where id = contact_id;
  else
    if contact.is_primary and exists (
      select 1 from public.customer_contacts
      where customer_id = contact.customer_id and is_active and id <> contact_id
    ) then
      raise exception 'Scegli prima un altro referente principale' using errcode = 'P0001';
    end if;
    update public.customer_contacts set is_active = false, is_primary = false
      where id = contact_id;
  end if;
end;
$$;

create function public.set_default_customer_address(address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  address public.customer_delivery_addresses;
begin
  if not (select private.can_use_customers()) then
    raise exception 'Operazione non consentita' using errcode = '42501';
  end if;
  select * into address from public.customer_delivery_addresses where id = address_id for update;
  if not found then
    raise exception 'Indirizzo non trovato' using errcode = 'P0002';
  end if;
  if not address.is_active then
    raise exception 'Un indirizzo disattivato non può essere il predefinito' using errcode = 'P0001';
  end if;
  update public.customer_delivery_addresses set is_default = false
    where customer_id = address.customer_id and is_default and id <> address_id;
  update public.customer_delivery_addresses set is_default = true where id = address_id;
end;
$$;

create function public.set_customer_address_active(address_id uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  address public.customer_delivery_addresses;
begin
  if (select private.current_user_role()) is null
    or (select private.current_user_role()) not in ('owner', 'sales_manager') then
    raise exception 'Solo titolare e responsabile commerciale disattivano gli indirizzi' using errcode = '42501';
  end if;
  select * into address from public.customer_delivery_addresses where id = address_id for update;
  if not found then
    raise exception 'Indirizzo non trovato' using errcode = 'P0002';
  end if;

  if active then
    update public.customer_delivery_addresses
    set is_active = true,
        is_default = not exists (
          select 1 from public.customer_delivery_addresses
          where customer_id = address.customer_id and is_default and id <> address_id
        )
    where id = address_id;
  else
    if address.is_default and exists (
      select 1 from public.customer_delivery_addresses
      where customer_id = address.customer_id and is_active and id <> address_id
    ) then
      raise exception 'Scegli prima un altro indirizzo predefinito' using errcode = 'P0001';
    end if;
    update public.customer_delivery_addresses set is_active = false, is_default = false
      where id = address_id;
  end if;
end;
$$;

revoke execute on function public.set_primary_customer_contact(uuid) from public, anon;
revoke execute on function public.set_customer_contact_active(uuid, boolean) from public, anon;
revoke execute on function public.set_default_customer_address(uuid) from public, anon;
revoke execute on function public.set_customer_address_active(uuid, boolean) from public, anon;
grant execute on function public.set_primary_customer_contact(uuid) to authenticated;
grant execute on function public.set_customer_contact_active(uuid, boolean) to authenticated;
grant execute on function public.set_default_customer_address(uuid) to authenticated;
grant execute on function public.set_customer_address_active(uuid, boolean) to authenticated;

-- Ricerca nell'elenco clienti --------------------------------------------------------------------
-- Per nome, partita IVA, codice fiscale, PEC ed email dei referenti attivi (anche parti).
-- Testo da 3 a 100 caratteri; 20 ricerche al minuto per utente, contate a parte da quelle dei
-- clienti simili. Restituisce le righe dei clienti: l'elenco ne mostra solo nome, tipo, comune e
-- completezza, mai i referenti.

create table private.customer_search_calls (
  user_id uuid not null,
  called_at timestamptz not null default now()
);
create index customer_search_calls_idx on private.customer_search_calls (user_id, called_at);
revoke all on private.customer_search_calls from public, anon, authenticated;

create function private.customer_search_limit()
returns integer
language sql
immutable
set search_path = ''
as $$ select 20 $$;

create function public.search_customers(search_text text)
returns setof public.customers
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  wanted text := regexp_replace(btrim(coalesce(search_text, '')), '\s+', ' ', 'g');
  pattern text;
  code_pattern text;
begin
  if caller is null or not (select private.can_use_customers()) then
    raise exception 'Operazione non consentita' using errcode = '42501';
  end if;
  if char_length(wanted) > 100 then
    raise exception 'Testo di ricerca troppo lungo' using errcode = '22001';
  end if;
  if char_length(wanted) < 3 then
    raise exception 'Testo di ricerca troppo corto' using errcode = '22023';
  end if;

  delete from private.customer_search_calls
    where user_id = caller and called_at < now() - interval '1 minute';
  if (select count(*) from private.customer_search_calls where user_id = caller)
    >= (select private.customer_search_limit()) then
    raise exception 'Troppe ricerche ravvicinate: riprova tra un minuto' using errcode = 'P0001';
  end if;
  insert into private.customer_search_calls (user_id) values (caller);

  -- I caratteri speciali di LIKE si cercano come testo.
  pattern := '%' || replace(replace(replace(wanted, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  code_pattern := '%' || upper(regexp_replace(wanted, '[^A-Za-z0-9]', '', 'g')) || '%';

  return query
    select c.*
    from public.customers c
    where c.name ilike pattern
      or c.pec ilike pattern
      or (code_pattern <> '%%' and (c.vat_number like code_pattern or c.tax_code like code_pattern))
      or exists (
        select 1 from public.customer_contacts cc
        where cc.customer_id = c.id and cc.is_active and cc.email ilike pattern
      )
    order by c.name;
end;
$$;

revoke execute on function public.search_customers(text) from public, anon;
grant execute on function public.search_customers(text) to authenticated;
