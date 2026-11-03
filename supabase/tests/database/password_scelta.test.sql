-- Il segno «password scelta» si scrive solo con una password davvero salvata.
-- Tutto avviene in una transazione annullata alla fine: nel database non resta nulla.
begin;
-- Il comando di test entra con un ruolo ridotto: si lavora come postgres, come le migrazioni.
set local role postgres;
set local search_path = public, extensions;

select plan(4);

insert into auth.users (id, email, encrypted_password, aud, role) values
  ('00000000-0000-4000-8000-000000000001', 'senza-password@prova.test', '', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000002', 'con-password@prova.test', '$2a$10$hashinventatoperlaprova', 'authenticated', 'authenticated');
insert into public.profiles (user_id, role) values
  ('00000000-0000-4000-8000-000000000001', 'sales_consultant'),
  ('00000000-0000-4000-8000-000000000002', 'sales_consultant');

-- Utente invitato senza password che chiama la funzione a mano.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select lives_ok('select public.mark_password_set()', 'senza password la chiamata non dà errore');
set local role postgres;
select is(
  (select password_set_at from public.profiles where user_id = '00000000-0000-4000-8000-000000000001'),
  null,
  'senza password il segno resta vuoto'
);

-- Utente che ha salvato la password.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.mark_password_set();
set local role postgres;
select isnt(
  (select password_set_at from public.profiles where user_id = '00000000-0000-4000-8000-000000000002'),
  null,
  'con la password salvata il segno viene scritto'
);
select is(
  (select password_set_at from public.profiles where user_id = '00000000-0000-4000-8000-000000000001'),
  null,
  'il segno di un altro utente non cambia'
);

select * from finish();
rollback;
