-- Regole di brand, collegamenti, partita IVA unica e archivio dei loghi.
-- Tutto avviene in una transazione annullata alla fine: nel database non resta nulla.
begin;
-- Il comando di test entra con un ruolo ridotto: si lavora come postgres, come le migrazioni.
set local role postgres;
set local search_path = public, extensions;

select plan(17);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-0000000000b1', 'titolare@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-0000000000b2', 'consulente@prova.test', '', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-0000000000b1', 'owner'),
  ('00000000-0000-4000-8000-0000000000b2', 'sales_consultant');
insert into public.companies (id, legal_name, vat_number) values
  ('00000000-0000-4000-8000-0000000000d1', 'Società Inventata Srl', '01234567897');

-- Consulente: niente brand, collegamenti né loghi.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.brands (name) values ('Brand del consulente')$$,
  '42501', null, 'il consulente non crea brand'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('logos', 'brands/x/y.png')$$,
  '42501', null, 'il consulente non carica loghi'
);

-- Titolare: crea il brand; il nome è unico senza differenze di maiuscole e spazi.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.brands (name, creation_key)
    values ('Brand Inventato', '00000000-0000-4000-8000-0000000000f1')$$,
  'il titolare crea un brand'
);
select throws_ok(
  $$insert into public.brands (name) values ('  brand   INVENTATO ')$$,
  '23505', null, 'due brand con lo stesso nome (maiuscole e spazi a parte) non sono ammessi'
);
update public.brands set is_active = false where id = (select id from public.brands where name = 'Brand Inventato');
select throws_ok(
  $$insert into public.brands (name) values ('Brand Inventato')$$,
  '23505', null, 'il nome resta occupato anche se il brand è disattivato'
);
select throws_ok(
  $$insert into public.brands (name, creation_key) values ('Altro Brand', '00000000-0000-4000-8000-0000000000f1')$$,
  '23505', null, 'un secondo invio dello stesso brand non crea un doppione'
);

-- Partita IVA unica quando è compilata; più società senza partita IVA vanno bene.
select throws_ok(
  $$insert into public.companies (legal_name, vat_number) values ('Altra Società Srl', '01234567897')$$,
  '23505', null, 'due società con la stessa partita IVA non sono ammesse'
);
select lives_ok(
  $$insert into public.companies (legal_name) values ('Senza IVA Uno'), ('Senza IVA Due')$$,
  'più società senza partita IVA sono ammesse'
);

-- Collegamenti: il titolare collega e scollega.
select lives_ok(
  $$insert into public.company_brands (company_id, brand_id)
    values ('00000000-0000-4000-8000-0000000000d1', (select id from public.brands where name = 'Brand Inventato'))$$,
  'il titolare collega un brand a una società'
);

-- Logo: il titolare carica nell'archivio privato.
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('logos', 'brands/00000000-0000-4000-8000-0000000000e1/00000000-0000-4000-8000-0000000000aa.png')$$,
  'il titolare carica un logo'
);
select throws_ok(
  $$update public.brands set logo_path = 'brands/../altro.svg' where id = (select id from public.brands where name = 'Brand Inventato')$$,
  '23514', null, 'il percorso del logo deve essere quello generato dal server'
);

-- Consulente: non legge i loghi e non tocca i collegamenti.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'logos'),
  0, 'il consulente non vede i file dell''archivio dei loghi'
);
select throws_ok(
  $$insert into public.company_brands (company_id, brand_id)
    values ('00000000-0000-4000-8000-0000000000d1', (select id from public.brands where name = 'Brand Inventato'))$$,
  '42501', null, 'il consulente non collega brand'
);
with removed as (delete from public.company_brands returning 1)
select is((select count(*)::int from removed), 0, 'il consulente non scollega brand');

-- Titolare: scollega; il registro conserva il collegamento tolto.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select lives_ok(
  $$delete from public.company_brands where brand_id = (select id from public.brands where name = 'Brand Inventato')$$,
  'il titolare scollega il brand'
);
set local role postgres;
select ok(
  exists (select 1 from public.audit_log where table_name = 'company_brands' and action = 'delete'
    and actor_id = '00000000-0000-4000-8000-0000000000b1'),
  'il registro conserva il collegamento tolto, con chi e quando'
);
select is(
  (select public from storage.buckets where id = 'logos'),
  false, 'l''archivio dei loghi è privato'
);

select * from finish();
rollback;
