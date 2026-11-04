-- Ricerca dell'elenco clienti: per nome, codici, PEC ed email dei referenti attivi (anche parti),
-- solo per chi vede i clienti, testo da 3 a 100 caratteri, 20 ricerche al minuto contate a parte
-- dai clienti simili. Transazione annullata alla fine.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000a2', 'cataloghi@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'sales_consultant'),
  ('00000000-0000-4000-8000-0000000000a2', 'catalog_admin');
insert into public.customers (id, name, vat_number) values
  ('00000000-0000-4000-8000-0000000000a3', 'Zeta Ricerca Inventata', '01234567897'),
  ('00000000-0000-4000-8000-0000000000a4', 'Omega Ricerca Inventata', null);
insert into public.customer_contacts (customer_id, name, email, is_active) values
  ('00000000-0000-4000-8000-0000000000a3', 'Referente Attivo', 'ufficio@zetainventata.test', true),
  ('00000000-0000-4000-8000-0000000000a4', 'Referente Spento', 'vecchio@omegainventata.test', false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

select results_eq(
  $$select name from public.search_customers('zetainventata')$$,
  $$values ('Zeta Ricerca Inventata'::text)$$,
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

-- Sopra ne sono state contate 6; altre 14 arrivano a 20. Le ricerche dei simili non contano.
select lives_ok(
  $$select count(*) from generate_series(1, 14) as n, lateral public.search_customers('ricerca ' || n)$$,
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
