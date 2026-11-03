-- Segno «password scelta» nel profilo: finché è vuoto, il gestionale porta l'utente su
-- /imposta-password. I profili già esistenti partono vuoti: la password si sceglie una volta.
alter table public.profiles add column password_set_at timestamptz;

-- La chiama il gestionale subito dopo che l'utente ha salvato la propria password.
create function public.mark_password_set()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set password_set_at = now()
  where user_id = (select auth.uid()) and password_set_at is null;
$$;

revoke execute on function public.mark_password_set() from public, anon;
grant execute on function public.mark_password_set() to authenticated;

-- Solo per il comando che crea gli inviti (chiave segreta): controlla che l'utente invitato
-- non abbia ricevuto una password. Restituisce solo sì o no, mai la password cifrata.
create function public.user_has_password(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(encrypted_password, '') <> ''
  from auth.users
  where id = target_user_id;
$$;

revoke execute on function public.user_has_password(uuid) from public, anon, authenticated;
grant execute on function public.user_has_password(uuid) to service_role;
