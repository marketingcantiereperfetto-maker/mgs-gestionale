-- Verifica del collegamento tra l'app e il database.
-- Non legge tabelle: restituisce solo l'esito e l'ora del server.
create or replace function public.health_check()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('ok', true, 'server_time', now());
$$;

revoke execute on function public.health_check() from public;
grant execute on function public.health_check() to anon, authenticated;
