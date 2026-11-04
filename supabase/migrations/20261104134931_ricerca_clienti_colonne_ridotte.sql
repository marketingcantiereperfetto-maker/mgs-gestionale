-- Ricerca nell'elenco clienti con il contratto dichiarato (correzione del titolare sulla
-- richiesta n. 14): solo id, nome, tipo di soggetto, comune e stato attivo, al massimo 50
-- risultati ordinati per nome; «has_more» dice se ce ne sono altri. Mai la riga intera del cliente.
-- Restano: testo da 3 a 100 caratteri, 20 ricerche al minuto per utente, solo per chi vede i clienti.

drop function public.search_customers(text);

create function private.customer_search_max_results()
returns integer
language sql
immutable
set search_path = ''
as $$ select 50 $$;

create function public.search_customers(search_text text)
returns table (
  id uuid,
  name text,
  subject_type public.customer_subject_type,
  city text,
  is_active boolean,
  has_more boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  wanted text := regexp_replace(btrim(coalesce(search_text, '')), '\s+', ' ', 'g');
  pattern text;
  code_pattern text;
  max_results integer := (select private.customer_search_max_results());
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
    select found.id, found.name, found.subject_type, found.address_city, found.is_active,
      found.total > max_results
    from (
      select c.id, c.name, c.subject_type, c.address_city, c.is_active,
        count(*) over () as total
      from public.customers c
      where c.name ilike pattern
        or c.pec ilike pattern
        or (code_pattern <> '%%' and (c.vat_number like code_pattern or c.tax_code like code_pattern))
        or exists (
          select 1 from public.customer_contacts cc
          where cc.customer_id = c.id and cc.is_active and cc.email ilike pattern
        )
      order by c.name, c.id
      limit max_results
    ) found
    order by found.name, found.id;
end;
$$;

revoke execute on function public.search_customers(text) from public, anon;
grant execute on function public.search_customers(text) to authenticated;
