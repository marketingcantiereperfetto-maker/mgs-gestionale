-- Permessi per utente (K0a; architettura v6 §20.2, decisioni del 6 novembre 2026).
-- Ogni controllo del database legge le facoltà effettive dell'utente, non il suo ruolo:
-- preset del ruolo + permessi aggiunti − permessi tolti. Il titolare ha sempre tutti i permessi.
-- Elenco e preset sono il modello del software (come i ruoli), non dati aziendali.

-- Elenco dei permessi --------------------------------------------------------------------------

create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null check (char_length(description) between 1 and 200),
  -- Sensibile: lo concede solo il titolare.
  is_sensitive boolean not null default false,
  sort_order integer not null unique
);

insert into public.permissions (key, description, is_sensitive, sort_order) values
  ('costs.view', 'Vedere i costi', true, 10),
  ('margins.view', 'Vedere i margini', true, 20),
  ('users.manage', 'Gestire utenti e autorizzazioni', true, 30),
  ('customers.export', 'Esportare gli elenchi dei clienti', true, 40),
  ('approvals.below_threshold', 'Approvare prezzi sotto la soglia di sicurezza', true, 50),
  ('settings.manage', 'Usare l''area Impostazioni', false, 60),
  ('companies.manage', 'Gestire società, brand, conti e loghi', false, 70),
  ('audit_log.view', 'Leggere il registro delle modifiche', false, 80),
  ('catalog.manage', 'Gestire il catalogo', false, 90),
  ('management_control.view', 'Vedere il controllo di gestione', false, 100),
  ('approvals.view', 'Vedere le richieste di autorizzazione', false, 110),
  ('consultants.view', 'Vedere la pagina Consulenti', false, 120),
  ('customers.view', 'Vedere i clienti', false, 130),
  ('customers.edit', 'Creare e modificare clienti, referenti e indirizzi', false, 140),
  ('customers.deactivate', 'Disattivare e riattivare clienti, referenti e indirizzi', false, 150),
  ('customers.group_company', 'Indicare la società del gruppo di un cliente', false, 160);

-- Preset dei ruoli (fissi): gli stessi poteri di prima. Il titolare ha comunque tutto.
create table public.role_permissions (
  role public.user_role not null,
  permission text not null references public.permissions (key) on delete cascade,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission)
  select 'owner', key from public.permissions;
insert into public.role_permissions (role, permission) values
  ('finance_admin', 'costs.view'),
  ('finance_admin', 'margins.view'),
  ('finance_admin', 'audit_log.view'),
  ('finance_admin', 'management_control.view'),
  ('finance_admin', 'customers.view'),
  ('finance_admin', 'customers.edit'),
  ('finance_admin', 'customers.group_company'),
  ('catalog_admin', 'costs.view'),
  ('catalog_admin', 'catalog.manage'),
  ('sales_manager', 'approvals.view'),
  ('sales_manager', 'consultants.view'),
  ('sales_manager', 'customers.view'),
  ('sales_manager', 'customers.edit'),
  ('sales_manager', 'customers.deactivate'),
  ('sales_consultant', 'customers.view'),
  ('sales_consultant', 'customers.edit');

-- Eccezioni per utente: aggiunto (granted) o tolto (not granted) rispetto al preset del ruolo.
create table public.user_permissions (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  permission text not null references public.permissions (key) on delete cascade,
  granted boolean not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create trigger user_permissions_audit after insert or update or delete on public.user_permissions
  for each row execute function private.log_change('user_id');

-- Controllo dei permessi -------------------------------------------------------------------------

-- Versione per un utente a scelta: solo per il sistema (nessun ruolo dell'app la può chiamare).
create function private.user_has_permission(target_user uuid, wanted text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when profile.role = 'owner' then true
      else coalesce(exception.granted, preset.permission is not null)
    end
    from public.profiles profile
    join public.permissions permission on permission.key = wanted
    left join public.role_permissions preset
      on preset.role = profile.role and preset.permission = wanted
    left join public.user_permissions exception
      on exception.user_id = profile.user_id and exception.permission = wanted
    where profile.user_id = target_user and profile.is_active
  ), false);
$$;

revoke all on function private.user_has_permission(uuid, text) from public, anon, authenticated;

-- Versione per le regole e le funzioni: vale solo per l'utente che la chiama.
create function private.has_permission(wanted text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_has_permission((select auth.uid()), wanted);
$$;

revoke all on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;

-- Le facoltà effettive di chi chiama (le legge il server per can()).
create function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select permission.key
  from public.permissions permission
  where private.user_has_permission((select auth.uid()), permission.key)
  order by permission.sort_order;
$$;

revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.my_permissions() to authenticated;

-- Le eccezioni si cambiano solo da qui. state: 'granted' (aggiunto), 'revoked' (tolto),
-- 'default' (come il ruolo). Regole: serve «utenti e autorizzazioni»; mai su se stessi; mai sul
-- titolare (ha sempre tutto); i sensibili solo dal titolare; nessuno cambia un permesso che non ha.
create function public.set_user_permission(target_user uuid, wanted text, state text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target public.profiles;
  permission public.permissions;
  in_preset boolean;
begin
  if caller is null or not (select private.has_permission('users.manage')) then
    raise exception 'Non puoi gestire utenti e autorizzazioni' using errcode = '42501';
  end if;
  if target_user = caller then
    raise exception 'Nessuno può cambiare i propri permessi' using errcode = '42501';
  end if;
  if state not in ('granted', 'revoked', 'default') then
    raise exception 'Stato del permesso non valido' using errcode = '22023';
  end if;
  select * into target from public.profiles where user_id = target_user;
  if not found then
    raise exception 'Utente non trovato' using errcode = 'P0002';
  end if;
  if target.role = 'owner' then
    raise exception 'Il titolare ha sempre tutti i permessi' using errcode = 'P0001';
  end if;
  select * into permission from public.permissions where key = wanted;
  if not found then
    raise exception 'Permesso non trovato' using errcode = 'P0002';
  end if;
  if permission.is_sensitive and (select private.current_user_role()) is distinct from 'owner' then
    raise exception 'I permessi sensibili li concede solo il titolare' using errcode = '42501';
  end if;
  if not (select private.has_permission(wanted)) then
    raise exception 'Non puoi concedere un permesso che non hai' using errcode = '42501';
  end if;

  in_preset := exists (
    select 1 from public.role_permissions where role = target.role and permission = wanted
  );
  -- Un'eccezione uguale al preset non serve: si torna al ruolo.
  if state = 'default' or (state = 'granted') = in_preset then
    delete from public.user_permissions where user_id = target_user and permission = wanted;
  else
    insert into public.user_permissions (user_id, permission, granted, changed_by)
    values (target_user, wanted, state = 'granted', caller)
    on conflict (user_id, permission)
      do update set granted = excluded.granted, changed_by = excluded.changed_by, changed_at = now();
  end if;
end;
$$;

revoke execute on function public.set_user_permission(uuid, text, text) from public, anon;
grant execute on function public.set_user_permission(uuid, text, text) to authenticated;

-- Lettura: elenco e preset li vedono tutti gli utenti; le eccezioni l'interessato e chi gestisce
-- utenti e autorizzazioni. Nessuna scrittura diretta.
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permissions enable row level security;
revoke all on public.permissions, public.role_permissions, public.user_permissions
  from anon, authenticated;
grant select on public.permissions, public.role_permissions, public.user_permissions
  to authenticated;

create policy permissions_select on public.permissions for select to authenticated
  using (true);
create policy role_permissions_select on public.role_permissions for select to authenticated
  using (true);
create policy user_permissions_select on public.user_permissions for select to authenticated
  using (
    user_id = (select auth.uid()) or (select private.has_permission('users.manage'))
  );

-- L'ultimo titolare attivo non si può togliere (né disattivare, né cambiare ruolo, né cancellare).
create function private.keep_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.is_active
    and (tg_op = 'DELETE' or new.role is distinct from 'owner' or not new.is_active)
    and not exists (
      select 1 from public.profiles
      where role = 'owner' and is_active and user_id <> old.user_id
    ) then
    raise exception 'L''ultimo titolare non si può togliere' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.keep_last_owner() from public;

create trigger profiles_keep_last_owner before update or delete on public.profiles
  for each row execute function private.keep_last_owner();

-- Regole del database sulle facoltà ----------------------------------------------------------------

-- Profili e collegamenti alle società: il proprio, oppure chi gestisce utenti e autorizzazioni.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('users.manage')));
drop policy profile_companies_select on public.profile_companies;
create policy profile_companies_select on public.profile_companies for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('users.manage')));

-- Registro delle modifiche.
drop policy audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select private.has_permission('audit_log.view')));

-- Società, conti, brand, collegamenti e loghi: chi gestisce le società vede tutto; gli altri le
-- società a cui sono collegati.
drop policy companies_select on public.companies;
drop policy companies_insert on public.companies;
drop policy companies_update on public.companies;
create policy companies_select on public.companies for select to authenticated
  using (
    (select private.has_permission('companies.manage'))
    or id in (select private.current_company_ids())
  );
create policy companies_insert on public.companies for insert to authenticated
  with check ((select private.has_permission('companies.manage')));
create policy companies_update on public.companies for update to authenticated
  using ((select private.has_permission('companies.manage')))
  with check ((select private.has_permission('companies.manage')));

drop policy company_bank_accounts_select on public.company_bank_accounts;
drop policy company_bank_accounts_insert on public.company_bank_accounts;
drop policy company_bank_accounts_update on public.company_bank_accounts;
create policy company_bank_accounts_select on public.company_bank_accounts for select
  to authenticated
  using (
    (select private.has_permission('companies.manage'))
    or company_id in (select private.current_company_ids())
  );
create policy company_bank_accounts_insert on public.company_bank_accounts for insert
  to authenticated with check ((select private.has_permission('companies.manage')));
create policy company_bank_accounts_update on public.company_bank_accounts for update
  to authenticated
  using ((select private.has_permission('companies.manage')))
  with check ((select private.has_permission('companies.manage')));

drop policy brands_select on public.brands;
drop policy brands_insert on public.brands;
drop policy brands_update on public.brands;
create policy brands_select on public.brands for select to authenticated
  using (
    (select private.has_permission('companies.manage'))
    or id in (
      select brand_id from public.company_brands
      where company_id in (select private.current_company_ids())
    )
  );
create policy brands_insert on public.brands for insert to authenticated
  with check ((select private.has_permission('companies.manage')));
create policy brands_update on public.brands for update to authenticated
  using ((select private.has_permission('companies.manage')))
  with check ((select private.has_permission('companies.manage')));

drop policy company_brands_select on public.company_brands;
drop policy company_brands_insert on public.company_brands;
drop policy company_brands_delete on public.company_brands;
create policy company_brands_select on public.company_brands for select to authenticated
  using (
    (select private.has_permission('companies.manage'))
    or company_id in (select private.current_company_ids())
  );
create policy company_brands_insert on public.company_brands for insert to authenticated
  with check ((select private.has_permission('companies.manage')));
create policy company_brands_delete on public.company_brands for delete to authenticated
  using ((select private.has_permission('companies.manage')));

drop policy logos_insert on storage.objects;
drop policy logos_select on storage.objects;
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (select private.has_permission('companies.manage')));
create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (select private.has_permission('companies.manage')));

create or replace function public.set_default_bank_account(account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.company_bank_accounts;
begin
  if not (select private.has_permission('companies.manage')) then
    raise exception 'Operazione riservata a chi gestisce le società' using errcode = '42501';
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

create or replace function public.set_bank_account_active(account_id uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account public.company_bank_accounts;
begin
  if not (select private.has_permission('companies.manage')) then
    raise exception 'Operazione riservata a chi gestisce le società' using errcode = '42501';
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

-- Registro: nomi degli autori e persone per il filtro, per chi legge il registro.
create or replace function public.audit_actor_labels(actor_ids uuid[])
returns table (user_id uuid, full_name text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.has_permission('audit_log.view')) then
    raise exception 'Operazione riservata a chi legge il registro' using errcode = '42501';
  end if;
  return query
    select u.id, p.full_name, u.email::text
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where u.id = any (actor_ids);
end;
$$;

create function public.audit_people()
returns table (user_id uuid, full_name text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.has_permission('audit_log.view')) then
    raise exception 'Operazione riservata a chi legge il registro' using errcode = '42501';
  end if;
  return query
    select p.user_id, p.full_name, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.user_id;
end;
$$;

revoke execute on function public.audit_people() from public, anon;
grant execute on function public.audit_people() to authenticated;

-- Clienti -------------------------------------------------------------------------------------------

-- Vedere i clienti (usata da ricerca, simili e autori).
create or replace function private.can_use_customers()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('customers.view');
$$;

drop policy customers_select on public.customers;
drop policy customers_insert on public.customers;
drop policy customers_update on public.customers;
create policy customers_select on public.customers for select to authenticated
  using ((select private.has_permission('customers.view')));
create policy customers_insert on public.customers for insert to authenticated
  with check ((select private.has_permission('customers.edit')));
-- Aggiorna chi modifica, chi disattiva o chi indica la società del gruppo; il controllo fine
-- (quale campo con quale permesso) è nel trigger qui sotto.
create policy customers_update on public.customers for update to authenticated
  using (
    (select private.has_permission('customers.edit'))
    or (select private.has_permission('customers.deactivate'))
    or (select private.has_permission('customers.group_company'))
  )
  with check (
    (select private.has_permission('customers.edit'))
    or (select private.has_permission('customers.deactivate'))
    or (select private.has_permission('customers.group_company'))
  );

create or replace function private.check_customer_restricted_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  -- Colonne che non sono dati modificabili dal modulo.
  technical constant text[] := array[
    'id', 'is_active', 'group_company_id', 'creation_key',
    'created_at', 'updated_at', 'created_by', 'updated_by'
  ];
  data_changed boolean;
begin
  -- Gli strumenti di amministrazione (prove e manutenzione) non hanno un utente dell'app.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.is_active is distinct from true
      and not (select private.has_permission('customers.deactivate')) then
      raise exception 'Solo titolare e responsabile commerciale disattivano i clienti' using errcode = '42501';
    end if;
    if new.group_company_id is not null
      and not (select private.has_permission('customers.group_company')) then
      raise exception 'Solo titolare e amministrazione economica indicano la società del gruppo' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.is_active is distinct from old.is_active
    and not (select private.has_permission('customers.deactivate')) then
    raise exception 'Solo titolare e responsabile commerciale disattivano i clienti' using errcode = '42501';
  end if;
  if new.group_company_id is distinct from old.group_company_id
    and not (select private.has_permission('customers.group_company')) then
    raise exception 'Solo titolare e amministrazione economica indicano la società del gruppo' using errcode = '42501';
  end if;
  select exists (
    select 1 from jsonb_each(to_jsonb(new)) as current_row(key, value)
    where key <> all (technical) and value is distinct from (to_jsonb(old) -> key)
  ) into data_changed;
  if data_changed and not (select private.has_permission('customers.edit')) then
    raise exception 'Non puoi modificare i clienti' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Referenti e indirizzi: vedere, aggiungere e modificare con i permessi dei clienti.
drop policy customer_contacts_select on public.customer_contacts;
drop policy customer_contacts_insert on public.customer_contacts;
drop policy customer_contacts_update on public.customer_contacts;
create policy customer_contacts_select on public.customer_contacts for select to authenticated
  using ((select private.has_permission('customers.view')));
create policy customer_contacts_insert on public.customer_contacts for insert to authenticated
  with check ((select private.has_permission('customers.edit')));
create policy customer_contacts_update on public.customer_contacts for update to authenticated
  using ((select private.has_permission('customers.edit')))
  with check ((select private.has_permission('customers.edit')));

drop policy customer_delivery_addresses_select on public.customer_delivery_addresses;
drop policy customer_delivery_addresses_insert on public.customer_delivery_addresses;
drop policy customer_delivery_addresses_update on public.customer_delivery_addresses;
create policy customer_delivery_addresses_select on public.customer_delivery_addresses
  for select to authenticated using ((select private.has_permission('customers.view')));
create policy customer_delivery_addresses_insert on public.customer_delivery_addresses
  for insert to authenticated with check ((select private.has_permission('customers.edit')));
create policy customer_delivery_addresses_update on public.customer_delivery_addresses
  for update to authenticated
  using ((select private.has_permission('customers.edit')))
  with check ((select private.has_permission('customers.edit')));

create or replace function public.set_primary_customer_contact(contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact public.customer_contacts;
begin
  if not (select private.has_permission('customers.edit')) then
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

create or replace function public.set_customer_contact_active(contact_id uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  contact public.customer_contacts;
begin
  if not (select private.has_permission('customers.deactivate')) then
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

create or replace function public.set_default_customer_address(address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  address public.customer_delivery_addresses;
begin
  if not (select private.has_permission('customers.edit')) then
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

create or replace function public.set_customer_address_active(address_id uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  address public.customer_delivery_addresses;
begin
  if not (select private.has_permission('customers.deactivate')) then
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
