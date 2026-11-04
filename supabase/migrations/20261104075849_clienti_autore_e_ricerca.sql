-- Autore nella scheda del cliente e ricerca (precisazioni del 4 novembre 2026).
-- Chi ha creato e chi ha modificato per ultimo: colonne scritte dal database, non dall'app.

alter table public.customers
  add column created_by uuid references auth.users (id) on delete set null,
  add column updated_by uuid references auth.users (id) on delete set null;

create function private.set_customer_authors()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- auth.uid() è vuoto per gli strumenti di prova e manutenzione.
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

revoke all on function private.set_customer_authors() from public;

create trigger customers_authors before insert or update on public.customers
  for each row execute function private.set_customer_authors();

-- Nomi degli autori dei clienti: solo nome del profilo o, se manca, email; solo per chi ha
-- accesso ai clienti e solo per chi ha creato o modificato un cliente.
create function public.customer_author_names(author_ids uuid[])
returns table (user_id uuid, label text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.can_use_customers()) then
    raise exception 'Operazione non consentita' using errcode = '42501';
  end if;
  return query
    select u.id, coalesce(p.full_name, u.email::text)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where u.id = any (author_ids)
      and exists (
        select 1 from public.customers c where c.created_by = u.id or c.updated_by = u.id
      );
end;
$$;

revoke execute on function public.customer_author_names(uuid[]) from public, anon;
grant execute on function public.customer_author_names(uuid[]) to authenticated;

create index customers_vat_number_idx on public.customers (vat_number);
create index customers_tax_code_idx on public.customers (tax_code);
