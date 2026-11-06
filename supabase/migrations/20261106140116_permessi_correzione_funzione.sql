-- Correzione di set_user_permission (K0a): la variabile «permission» aveva lo stesso nome della
-- colonna delle tabelle dei permessi, e il database non sapeva quale usare. Stesse regole.

create or replace function public.set_user_permission(target_user uuid, wanted text, state text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target public.profiles;
  entry public.permissions;
  in_preset boolean;
begin
  if caller is null or not (select private.has_permission('users.manage')) then
    raise exception 'Non puoi gestire utenti e autorizzazioni' using errcode = '42501';
  end if;
  if target_user = caller then
    raise exception 'Nessuno può cambiare i propri permessi' using errcode = '42501';
  end if;
  if state not in ('granted', 'revoked', 'default') then
    raise exception 'Stato del permesso non valido' using errcode = '22023';
  end if;
  select * into target from public.profiles where user_id = target_user;
  if not found then
    raise exception 'Utente non trovato' using errcode = 'P0002';
  end if;
  if target.role = 'owner' then
    raise exception 'Il titolare ha sempre tutti i permessi' using errcode = 'P0001';
  end if;
  select * into entry from public.permissions where key = wanted;
  if not found then
    raise exception 'Permesso non trovato' using errcode = 'P0002';
  end if;
  if entry.is_sensitive and (select private.current_user_role()) is distinct from 'owner' then
    raise exception 'I permessi sensibili li concede solo il titolare' using errcode = '42501';
  end if;
  if not (select private.has_permission(wanted)) then
    raise exception 'Non puoi concedere un permesso che non hai' using errcode = '42501';
  end if;

  in_preset := exists (
    select 1 from public.role_permissions preset
    where preset.role = target.role and preset.permission = wanted
  );
  -- Un'eccezione uguale al preset non serve: si torna al ruolo.
  if state = 'default' or (state = 'granted') = in_preset then
    delete from public.user_permissions exception
      where exception.user_id = target_user and exception.permission = wanted;
  else
    insert into public.user_permissions (user_id, permission, granted, changed_by)
    values (target_user, wanted, state = 'granted', caller)
    on conflict (user_id, permission)
      do update set granted = excluded.granted, changed_by = excluded.changed_by, changed_at = now();
  end if;
end;
$$;
