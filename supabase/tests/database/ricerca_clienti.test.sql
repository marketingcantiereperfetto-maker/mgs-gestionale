-- Ricerca dell'elenco clienti: per nome, codici, PEC ed email dei referenti attivi (anche parti),
-- solo per chi vede i clienti, testo da 3 a 100 caratteri, 20 ricerche al minuto contate a parte
-- dai clienti simili. Transazione annullata alla fine.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(17);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000a2', 'cataloghi@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'sales_consultant'),
  ('00000000-0000-4000-8000-0000000000a2', 'catalog_admin');
insert into public.customers (id, name, vat_number) values
  ('00000000-0000-4000-8000-0000000000a3', 'Zeta Ricerca Inventata', '01234567897'),
  ('00000000-0000-4000-8000-0000000000a4', 'Omega Ricerca Inventata', null);
-- 55 clienti con lo stesso nome di partenza, per il limite di 50 risultati.
insert into public.customers (name, tax_code, pec, address_street)
  select 'Lotto Ricerca ' || lpad(n::text, 2, '0'), 'RSSMRA85T10A562S', 'lotto@pec.prova.test', 'Via Lotto ' || n
  from generate_series(1, 55) as n;
insert into public.customer_contacts (customer_id, name, email, is_active) values
  ('00000000-0000-4000-8000-0000000000a3', 'Referente Attivo', 'ufficio@zetainventata.test', true),
  ('00000000-0000-4000-8000-0000000000a4', 'Referente Spento', 'vecchio@omegainventata.test', false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

select results_eq(
  $$select name, city, is_active, has_more from public.search_customers('zetainventata')$$,
  $$values ('Zeta Ricerca Inventata'::text, null::text, true, false)$$,
  'trova il cliente da una parte dell''email di un referente attivo'
);
select results_eq(
  $$select name from public.search_customers('UFFICIO@ZETA')$$,
  $$values ('Zeta Ricerca Inventata'::text)$$,
  'senza differenze di maiuscole'
);
select is(
  (select count(*)::int from public.search_customers('omegainventata')),
  0, 'le email dei referenti disattivati non contano'
);
select results_eq(
  $$select name from public.search_customers('omega ricerca')$$,
  $$values ('Omega Ricerca Inventata'::text)$$,
  'per nome'
);
select results_eq(
  $$select name from public.search_customers('0123 4567')$$,
  $$values ('Zeta Ricerca Inventata'::text)$$,
  'per partita IVA, anche con spazi'
);
select is(
  (select count(*)::int from public.search_customers('%%%')),
  0, 'i caratteri speciali si cercano come testo'
);
select throws_ok($$select * from public.search_customers('ab')$$, '22023', null, 'sotto i 3 caratteri rifiutato');
select throws_ok($$select * from public.search_customers(repeat('a', 101))$$, '22001', null, 'oltre i 100 caratteri rifiutato');

-- Solo id, nome, tipo, comune, stato e il segnale «ce ne sono altri»: mai la riga intera.
select is(
  (select pg_get_function_result('public.search_customers(text)'::regprocedure)),
  'TABLE(id uuid, name text, subject_type customer_subject_type, city text, is_active boolean, has_more boolean)',
  'il risultato ha solo id, nome, tipo, comune, stato e has_more'
);
select is(
  (select count(*)::int
    from pg_proc p, unnest(p.proargnames) as argument(name)
    where p.oid = 'public.search_customers(text)'::regprocedure
      and argument.name in ('tax_code', 'vat_number', 'pec', 'address_street', 'address_postal_code',
        'foreign_tax_id', 'sdi_code', 'email', 'phone')),
  0, 'nessuna colonna personale nel risultato'
);
-- La tabella temporanea la crea l'amministratore; la ricerca resta della consulente.
set local role postgres;
create temporary table lotto on commit drop as
  select * from public.search_customers('lotto ricerca');
grant select on lotto to authenticated;
set local role authenticated;
select is((select count(*)::int from lotto), 50, 'al massimo 50 risultati');
select ok((select bool_and(has_more) from lotto), 'con più di 50 clienti trovati, has_more è vero');
select is(
  (select array_agg(name order by name) from (select name from lotto order by name limit 2) first_two),
  array['Lotto Ricerca 01', 'Lotto Ricerca 02'], 'ordinati per nome'
);

-- Sopra ne sono state contate 7; altre 13 arrivano a 20. Le ricerche dei simili non contano.
select lives_ok(
  $$select count(*) from generate_series(1, 13) as n, lateral public.search_customers('ricerca ' || n)$$,
  'entro il limite le ricerche funzionano'
);
select lives_ok(
  $$select * from public.similar_customers(search_name => 'zeta ricerca')$$,
  'il limite è separato da quello dei clienti simili'
);
select throws_ok(
  $$select * from public.search_customers('zeta')$$,
  'P0001', 'Troppe ricerche ravvicinate: riprova tra un minuto', 'la 21ª ricerca nel minuto è rifiutata'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$select * from public.search_customers('zeta')$$, '42501', null, 'l''amministrazione cataloghi non cerca clienti');

select * from finish();
rollback;
