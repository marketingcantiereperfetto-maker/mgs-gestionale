-- Clienti simili e doppioni PA: la ricerca dà solo nome, comune, motivo e stato, solo a chi vede
-- i clienti, con testi da 3 a 100 caratteri e al massimo 20 chiamate al minuto; il blocco PA non
-- scatta con campi vuoti. Tutto in una transazione annullata alla fine.
begin;
set local role postgres;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000c7', 'consulente@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000c8', 'cataloghi@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000c7', 'sales_consultant'),
  ('00000000-0000-4000-8000-0000000000c8', 'catalog_admin');
insert into public.customers (name, vat_number, tax_code, address_city, pec, is_active) values
  ('Ferramenta Inventata Srl', '01234567897', null, 'Comune di Prova', 'ferramenta@pec.prova.test', true),
  ('Bottega Inventata', null, 'RSSMRA85T10A562S', null, null, false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c7","role":"authenticated"}', true);

select results_eq(
  $$select name, city, reason, is_active from public.similar_customers(search_name => 'ferramenta inventata')$$,
  $$values ('Ferramenta Inventata Srl'::text, 'Comune di Prova'::text, 'name'::text, true)$$,
  'nome simile: solo nome, comune, motivo e stato'
);
select results_eq(
  $$select name, reason from public.similar_customers(search_vat_number => '012 345 678 97')$$,
  $$values ('Ferramenta Inventata Srl'::text, 'vat_number'::text)$$,
  'stessa partita IVA, anche scritta con spazi'
);
select results_eq(
  $$select name, reason, is_active from public.similar_customers(search_tax_code => 'rssmra85t10a562s')$$,
  $$values ('Bottega Inventata'::text, 'tax_code'::text, false)$$,
  'stesso codice fiscale; i disattivati compaiono con il loro stato'
);
select is(
  (select count(*)::int from public.similar_customers(search_name => 'Zzzzzz qualcosa di diverso')),
  0, 'nessun risultato sotto la soglia di somiglianza'
);
select is(
  (select count(*)::int from public.similar_customers(search_name => 'Fe', search_vat_number => '01')),
  0, 'testi sotto i 3 caratteri ignorati'
);
select throws_ok(
  $$select * from public.similar_customers(search_name => repeat('a', 101))$$,
  '22001', null, 'testi oltre i 100 caratteri rifiutati'
);
select is(
  (select pg_get_function_result('public.similar_customers(text,text,text,uuid)'::regprocedure)),
  'TABLE(id uuid, name text, city text, reason text, is_active boolean)',
  'la funzione non restituisce codici fiscali, partite IVA, email o telefoni'
);

-- Limite: 20 ricerche al minuto per utente. Sopra ne sono state contate 4 (quelle con testi
-- troppo corti o troppo lunghi non contano): altre 16 arrivano a 20.
select lives_ok(
  $$select count(*) from generate_series(1, 16) as n, lateral public.similar_customers(search_name => 'ferramenta ' || n)$$,
  'entro il limite le ricerche funzionano'
);
select throws_ok(
  $$select * from public.similar_customers(search_name => 'ferramenta')$$,
  'P0001', 'Troppe ricerche ravvicinate: riprova tra un minuto',
  'oltre 20 ricerche al minuto la funzione si ferma'
);

-- Esclusi: amministrazione cataloghi e chi non è collegato.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c8","role":"authenticated"}', true);
select throws_ok(
  $$select * from public.similar_customers(search_name => 'ferramenta')$$,
  '42501', null, 'l''amministrazione cataloghi non cerca clienti'
);
set local role anon;
select throws_ok(
  $$select * from public.similar_customers(search_name => 'ferramenta')$$,
  '42501', null, 'chi non è collegato non cerca clienti'
);

-- Blocco PA: stessa partita IVA o codice fiscale e stesso codice ufficio.
set local role postgres;
insert into public.customers (name, vat_number, pa_office_code) values ('Comune Inventato A', '00000000000', 'UFF001');
select throws_ok(
  $$insert into public.customers (name, vat_number, pa_office_code) values ('Comune Inventato B', '00000000000', 'UFF001')$$,
  '23505', null, 'stessa partita IVA e stesso codice ufficio: bloccato'
);
select lives_ok(
  $$insert into public.customers (name, vat_number, pa_office_code) values ('Comune Inventato C', '00000000000', 'UFF002')$$,
  'stessa partita IVA, ufficio diverso: ammesso'
);
insert into public.customers (name, tax_code, pa_office_code) values ('Ufficio Inventato A', '80000000000', 'UFF003');
select throws_ok(
  $$insert into public.customers (name, tax_code, pa_office_code) values ('Ufficio Inventato B', '80000000000', 'UFF003')$$,
  '23505', null, 'stesso codice fiscale e stesso codice ufficio: bloccato'
);
select lives_ok(
  $$insert into public.customers (name) values ('Senza dati 1'), ('Senza dati 2'), ('Senza dati 3')$$,
  'più clienti senza dati fiscali possono esistere'
);
select lives_ok(
  $$insert into public.customers (name, vat_number) values ('Stessa IVA 1', '11111111111'), ('Stessa IVA 2', '11111111111')$$,
  'stessa partita IVA senza codice ufficio: il database non blocca (avviso nell''app)'
);

select * from finish();
rollback;
