-- Nessun dato personale nel registro (correzione del titolare, 4 novembre 2026): il registro è
-- immutabile e leggibile anche dall'amministrazione economica, quindi per i clienti salva solo
-- id, nome, tipo di soggetto, stato attivo e i NOMI dei campi cambiati (o compilati alla
-- creazione, o presenti alla cancellazione), mai i valori degli altri campi.

create function private.log_customer_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Colonne tecniche: non sono «campi» del cliente e non si elencano.
  technical constant text[] := array[
    'id', 'name', 'subject_type', 'is_active', 'creation_key',
    'created_at', 'updated_at', 'created_by', 'updated_by'
  ];
  source jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  fields text[];
  snapshot_old jsonb;
  snapshot_new jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}')
      into fields
      from jsonb_each(to_jsonb(new)) as current_row(key, value)
      where key <> all (technical)
        and value is distinct from (to_jsonb(old) -> key);
  else
    -- Creazione e cancellazione: i nomi dei campi compilati.
    select coalesce(array_agg(key order by key), '{}')
      into fields
      from jsonb_each(source) as current_row(key, value)
      where key <> all (technical) and value <> 'null'::jsonb;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    snapshot_old := jsonb_build_object(
      'id', old.id, 'name', old.name, 'subject_type', old.subject_type, 'is_active', old.is_active
    );
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    snapshot_new := jsonb_build_object(
      'id', new.id, 'name', new.name, 'subject_type', new.subject_type, 'is_active', new.is_active,
      'changed_fields', to_jsonb(fields)
    );
  else
    snapshot_old := snapshot_old || jsonb_build_object('changed_fields', to_jsonb(fields));
  end if;

  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, source ->> 'id', lower(tg_op), snapshot_old, snapshot_new);
  return null;
end;
$$;

revoke all on function private.log_customer_change() from public;

drop trigger customers_audit on public.customers;
create trigger customers_audit after insert or update or delete on public.customers
  for each row execute function private.log_customer_change();
