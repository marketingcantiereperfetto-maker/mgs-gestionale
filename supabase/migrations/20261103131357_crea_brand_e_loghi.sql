-- Brand, collegamento con le società, loghi e partita IVA unica (backlog 4, cap. 3;
-- decisioni del 3 novembre 2026). Nessuna cancellazione: brand e società si disattivano;
-- il collegamento brand-società invece si toglie (resta nel registro).

-- Partita IVA unica tra le società, comprese le disattivate, quando è compilata.
alter table public.companies
  add constraint companies_vat_number_key unique (vat_number),
  -- Logo di riserva della società: percorso nell'archivio privato «logos».
  add column fallback_logo_path text check (fallback_logo_path ~ '^companies/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$');

grant update (fallback_logo_path) on public.companies to authenticated;

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- Nome confrontabile: senza differenze di maiuscole e spazi. Unico anche tra i disattivati.
  name_key text generated always as (lower(regexp_replace(trim(name), '\s+', ' ', 'g'))) stored
    constraint brands_name_key_key unique,
  logo_path text check (logo_path ~ '^brands/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'),
  is_active boolean not null default true,
  creation_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_brands (
  company_id uuid not null references public.companies (id) on delete restrict,
  brand_id uuid not null references public.brands (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (company_id, brand_id)
);

create index company_brands_brand_idx on public.company_brands (brand_id);

create trigger brands_updated_at before update on public.brands
  for each row execute function private.set_updated_at();
create trigger brands_audit after insert or update or delete on public.brands
  for each row execute function private.log_change('id');
create trigger company_brands_audit after insert or update or delete on public.company_brands
  for each row execute function private.log_change('brand_id');

alter table public.brands enable row level security;
alter table public.company_brands enable row level security;
revoke all on public.brands from anon, authenticated;
revoke all on public.company_brands from anon, authenticated;

grant select on public.brands to authenticated;
grant insert (name, creation_key) on public.brands to authenticated;
grant update (name, is_active, logo_path) on public.brands to authenticated;
grant select, insert, delete on public.company_brands to authenticated;

-- Leggono il titolare e chi è collegato a una società del brand; scrive solo il titolare.
create policy brands_select on public.brands for select to authenticated
  using (
    (select private.current_user_role()) = 'owner'
    or id in (
      select brand_id from public.company_brands
      where company_id in (select private.current_company_ids())
    )
  );
create policy brands_insert on public.brands for insert to authenticated
  with check ((select private.current_user_role()) = 'owner');
create policy brands_update on public.brands for update to authenticated
  using ((select private.current_user_role()) = 'owner')
  with check ((select private.current_user_role()) = 'owner');

create policy company_brands_select on public.company_brands for select to authenticated
  using (
    (select private.current_user_role()) = 'owner'
    or company_id in (select private.current_company_ids())
  );
create policy company_brands_insert on public.company_brands for insert to authenticated
  with check ((select private.current_user_role()) = 'owner');
create policy company_brands_delete on public.company_brands for delete to authenticated
  using ((select private.current_user_role()) = 'owner');

-- Archivio privato dei loghi: limiti di tipo e dimensione anche qui, oltre al controllo del
-- contenuto vero sul server. Solo il titolare carica e legge (per creare indirizzi firmati).
-- Nessuna modifica né cancellazione: un logo sostituito resta nell'archivio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 1048576, array['image/png', 'image/jpeg', 'image/webp']);

create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (select private.current_user_role()) = 'owner');
create policy logos_select on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (select private.current_user_role()) = 'owner');
