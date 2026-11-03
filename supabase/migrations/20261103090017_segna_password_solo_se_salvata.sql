-- Il segno «password scelta» si scrive solo se l'utente ha davvero una password salvata:
-- chiamare la funzione a mano, senza password, non cambia nulla.
create or replace function public.mark_password_set()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set password_set_at = now()
  where user_id = (select auth.uid())
    and password_set_at is null
    and exists (
      select 1
      from auth.users
      where id = (select auth.uid()) and coalesce(encrypted_password, '') <> ''
    );
$$;
