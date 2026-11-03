-- Registro delle modifiche: chi, quando, cosa, per configurazioni e dati economici.
-- Le righe si scrivono solo dai trigger e non si modificano né si cancellano.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb
);

create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- actor_id vuoto = operazione di sistema (per esempio un comando eseguito con la chiave segreta).
-- tg_argv[0] è il nome della colonna che identifica la riga.
create function private.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    row_data ->> tg_argv[0],
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

revoke all on function private.log_change() from public;
