-- Le facoltà ristrette sui clienti (attivo sì/no, società del gruppo) valgono per gli utenti
-- del gestionale. Gli strumenti di amministrazione (procedure di prova e manutenzione con la
-- chiave segreta) non hanno un ruolo utente e non vanno bloccati.
create or replace function private.check_customer_restricted_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  role public.user_role;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  role := (select private.current_user_role());
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
