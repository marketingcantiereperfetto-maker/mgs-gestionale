-- Clienti simili e doppioni (clienti A2, decisioni del 4 novembre 2026).

create extension if not exists pg_trgm with schema extensions;

create index customers_name_trgm_idx on public.customers
  using gin (lower(name) extensions.gin_trgm_ops);

-- Blocco dei doppioni della Pubblica Amministrazione: stessa partita IVA o stesso codice fiscale
-- e stesso codice ufficio. Con campi vuoti il vincolo non scatta.
create unique index customers_vat_office_key on public.customers (vat_number, pa_office_code)
  where vat_number is not null and pa_office_code is not null;
create unique index customers_tax_office_key on public.customers (tax_code, pa_office_code)
  where tax_code is not null and pa_office_code is not null;

-- Soglia di somiglianza dei nomi: un solo punto, da cambiare con una migrazione.
create function private.customer_name_similarity_threshold()
returns real
language sql
immutable
set search_path = ''
as $$ select 0.4::real $$;

-- Ricerche dei simili per utente, per il limite di chiamate ravvicinate.
create table private.customer_similarity_calls (
  user_id uuid not null,
  called_at timestamptz not null default now()
);
create index customer_similarity_calls_idx on private.customer_similarity_calls (user_id, called_at);
revoke all on private.customer_similarity_calls from public, anon, authenticated;

create function private.customer_similarity_limit()
returns integer
language sql
immutable
set search_path = ''
as $$ select 20 $$;

-- Clienti simili: solo identificativo, nome, comune, motivo e stato; mai codici fiscali, email o
-- telefoni. Per chi vede i clienti, al massimo 5 risultati e 20 ricerche al minuto.
create function public.similar_customers(
  search_name text default null,
  search_vat_number text default null,
  search_tax_code text default null,
  exclude_id uuid default null
)
returns table (id uuid, name text, city text, reason text, is_active boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  wanted_name text := nullif(btrim(coalesce(search_name, '')), '');
  wanted_vat text := nullif(upper(regexp_replace(coalesce(search_vat_number, ''), '\s', '', 'g')), '');
  wanted_tax text := nullif(upper(regexp_replace(coalesce(search_tax_code, ''), '\s', '', 'g')), '');
begin
  if caller is null or not (select private.can_use_customers()) then
    raise exception 'Operazione non consentita' using errcode = '42501';
  end if;
  if char_length(coalesce(search_name, '')) > 100
    or char_length(coalesce(search_vat_number, '')) > 100
    or char_length(coalesce(search_tax_code, '')) > 100 then
    raise exception 'Testo di ricerca troppo lungo' using errcode = '22001';
  end if;
  if char_length(wanted_name) < 3 then wanted_name := null; end if;
  if char_length(wanted_vat) < 3 then wanted_vat := null; end if;
  if char_length(wanted_tax) < 3 then wanted_tax := null; end if;
  if wanted_name is null and wanted_vat is null and wanted_tax is null then
    return;
  end if;

  delete from private.customer_similarity_calls
    where user_id = caller and called_at < now() - interval '1 minute';
  if (select count(*) from private.customer_similarity_calls where user_id = caller)
    >= (select private.customer_similarity_limit()) then
    raise exception 'Troppe ricerche ravvicinate: riprova tra un minuto' using errcode = 'P0001';
  end if;
  insert into private.customer_similarity_calls (user_id) values (caller);

  return query
    select c.id, c.name, c.address_city, matches.reason, c.is_active
    from public.customers c
    cross join lateral (
      select case
        when wanted_vat is not null and c.vat_number = wanted_vat then 'vat_number'
        when wanted_tax is not null and c.tax_code = wanted_tax then 'tax_code'
        when wanted_name is not null
          and extensions.similarity(lower(c.name), lower(wanted_name))
            >= (select private.customer_name_similarity_threshold()) then 'name'
      end as reason,
      case when wanted_name is null then 0
        else extensions.similarity(lower(c.name), lower(wanted_name)) end as score
    ) matches
    where matches.reason is not null
      and (exclude_id is null or c.id <> exclude_id)
    order by (matches.reason <> 'name') desc, matches.score desc, c.name
    limit 5;
end;
$$;

revoke execute on function public.similar_customers(text, text, text, uuid) from public, anon;
grant execute on function public.similar_customers(text, text, text, uuid) to authenticated;
