-- Registro delle modifiche e nome del profilo (parte C del giorno 5; decisioni del 3 novembre
-- 2026).

-- Nome del profilo: ognuno cambia solo il proprio, e solo la colonna del nome. Il permesso è
-- sulla colonna: ruolo, stato e gli altri campi restano non modificabili dall'app.
alter table public.profiles
  add constraint profiles_full_name_check
  check (full_name is null or (char_length(full_name) between 1 and 80 and full_name = btrim(full_name)));

grant update (full_name) on public.profiles to authenticated;

create policy profiles_update_own_name on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Registro: indici per i filtri (data, tipo di dato, persona) e l'ordine per data e
-- identificativo, usato dalla paginazione «dopo questa riga».
drop index public.audit_log_occurred_at_idx;
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc, id desc);
create index audit_log_table_occurred_idx on public.audit_log (table_name, occurred_at desc, id desc);
create index audit_log_actor_occurred_idx on public.audit_log (actor_id, occurred_at desc, id desc);
-- Storico nella scheda di società e brand: le righe che riguardano una società.
create index audit_log_new_company_idx on public.audit_log ((new_data ->> 'company_id'));
create index audit_log_old_company_idx on public.audit_log ((old_data ->> 'company_id'));

-- Nomi ed email degli autori del registro, solo per il titolare: senza nome si mostra l'email,
-- che sta in auth.users e non è leggibile dall'app.
create function public.audit_actor_labels(actor_ids uuid[])
returns table (user_id uuid, full_name text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.current_user_role()) is distinct from 'owner' then
    raise exception 'Operazione riservata al titolare' using errcode = '42501';
  end if;
  return query
    select u.id, p.full_name, u.email::text
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    where u.id = any (actor_ids);
end;
$$;

revoke execute on function public.audit_actor_labels(uuid[]) from public, anon;
grant execute on function public.audit_actor_labels(uuid[]) to authenticated;
