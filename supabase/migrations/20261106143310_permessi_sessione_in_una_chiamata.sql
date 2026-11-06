-- Profilo e facoltà effettive dell'utente collegato in una sola chiamata (K0a, prestazioni):
-- ogni pagina legge la sessione una volta, senza una richiesta in più per i permessi.
-- Vale solo per chi chiama; nessuna riga se il profilo non esiste.

create function public.my_session()
returns table (
  role public.user_role,
  full_name text,
  is_active boolean,
  password_set_at timestamptz,
  company_ids uuid[],
  permissions text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.role,
    profile.full_name,
    profile.is_active,
    profile.password_set_at,
    coalesce(
      (select array_agg(link.company_id order by link.company_id)
       from public.profile_companies link where link.user_id = profile.user_id),
      '{}'
    ),
    coalesce(
      (select array_agg(permission.key order by permission.sort_order)
       from public.permissions permission
       where private.user_has_permission(profile.user_id, permission.key)),
      '{}'
    )
  from public.profiles profile
  where profile.user_id = (select auth.uid());
$$;

revoke execute on function public.my_session() from public, anon;
grant execute on function public.my_session() to authenticated;
