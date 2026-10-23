-- =====================================================================
-- TuBodega: esquema de Supabase
-- Pega TODO este archivo en Supabase → SQL Editor → New query → Run.
-- Se puede volver a ejecutar sin perder datos.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text,
  phone text,
  rif text,
  address text,
  plan text not null default 'basico' check (plan in ('basico', 'pro')),
  monthly_price numeric(10, 2) not null default 10,
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended', 'cancelled')),
  paid_until timestamptz not null default now() + interval '7 days',
  activation_code text unique,
  referral_code text unique,
  referred_by uuid references public.stores (id) on delete set null,
  free_months int not null default 0,
  notes text,
  stats jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  last_backup_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'seller')),
  created_at timestamptz not null default now()
);
create index if not exists profiles_store_idx on public.profiles (store_id);
-- La prueba gratis dura 7 días
alter table public.stores alter column paid_until set default now() + interval '7 days';
-- Sube cuando el admin cierra la sesión de ese usuario a distancia
alter table public.profiles add column if not exists session_rev int not null default 0;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  amount_usd numeric(10, 2) not null check (amount_usd > 0),
  amount_bs numeric(14, 2),
  method text not null,
  reference text,
  note text,
  months int not null default 1 check (months between 1 and 12),
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  created_by uuid,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);
create index if not exists payments_store_idx on public.payments (store_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status);

-- Teléfonos de cada bodega (el plan Básico permite 1 a la vez)
create table if not exists public.store_devices (
  store_id uuid not null references public.stores (id) on delete cascade,
  device_id text not null,
  name text,
  user_id uuid,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (store_id, device_id)
);

-- Sincronización entre teléfonos: una fila por cada registro de la bodega
-- (producto, venta, fiado...). seq crece con cada cambio para saber qué falta bajar.
create sequence if not exists public.sync_seq;
create table if not exists public.sync_rows (
  store_id uuid not null references public.stores (id) on delete cascade,
  tbl text not null,
  row_id text not null,
  data jsonb,
  deleted boolean not null default false,
  device text,
  seq bigint not null default nextval('public.sync_seq'),
  updated_at timestamptz not null default now(),
  primary key (store_id, tbl, row_id)
);
create index if not exists sync_rows_seq_idx on public.sync_rows (store_id, seq);

create table if not exists public.app_config (
  id int primary key default 1 check (id = 1),
  pago_movil text,
  zelle text,
  binance text,
  whatsapp text,
  updated_at timestamptz not null default now()
);
insert into public.app_config (id) values (1) on conflict (id) do nothing;
-- Datos del responsable que salen en los Términos y la Política de Privacidad
alter table public.app_config add column if not exists legal_name text;
alter table public.app_config add column if not exists legal_id text;
alter table public.app_config add column if not exists legal_email text;
alter table public.app_config add column if not exists legal_city text;

-- Aceptación de los Términos y la Política de Privacidad (qué versión y cuándo)
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- Prospectos: los negocios que visitas para venderles TuBodega (solo los ve el admin)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  phone text,
  zone text,
  status text not null default 'nuevo'
    check (status in ('nuevo', 'visitado', 'interesado', 'demo', 'prueba', 'cliente', 'perdido')),
  next_at date,
  notes text,
  store_id uuid references public.stores (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads (status, next_at);

-- ---------------------------------------------------------------------
-- Funciones de apoyo
-- ---------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.my_store_id() returns uuid
language sql stable security definer set search_path = public as $$
  select store_id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'solo_admin' using errcode = '42501';
  end if;
end;
$$;

-- Código corto sin letras confusas (sin 0/O, 1/I/L)
create or replace function public.random_code(len int) returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1), '')
  from generate_series(1, len);
$$;

create or replace function public.store_json(s public.stores) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', s.id, 'name', s.name, 'owner_name', s.owner_name, 'phone', s.phone, 'rif', s.rif, 'address', s.address,
    'plan', s.plan, 'monthly_price', s.monthly_price, 'status', s.status, 'paid_until', s.paid_until,
    'referral_code', s.referral_code, 'free_months', s.free_months, 'created_at', s.created_at
  );
$$;

-- ---------------------------------------------------------------------
-- Seguridad por fila: cada bodega solo ve lo suyo, el admin ve todo
-- ---------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.app_config enable row level security;
alter table public.store_devices enable row level security;
alter table public.sync_rows enable row level security;
alter table public.leads enable row level security;

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated using (public.is_admin());

drop policy if exists store_devices_select on public.store_devices;
create policy store_devices_select on public.store_devices for select to authenticated
  using (store_id = public.my_store_id() or public.is_admin());

drop policy if exists sync_rows_select on public.sync_rows;
create policy sync_rows_select on public.sync_rows for select to authenticated
  using (store_id = public.my_store_id());

drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores for select to authenticated
  using (id = public.my_store_id() or public.is_admin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (store_id = public.my_store_id() or public.is_admin());

drop policy if exists app_config_select on public.app_config;
create policy app_config_select on public.app_config for select to authenticated using (true);

drop policy if exists app_config_update on public.app_config;
create policy app_config_update on public.app_config for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Nadie escribe directo en stores/profiles/payments: todo pasa por las funciones de abajo.
revoke insert, update, delete on public.stores, public.profiles, public.payments, public.admins, public.store_devices, public.sync_rows, public.leads from anon, authenticated;
revoke all on public.stores, public.profiles, public.payments, public.admins, public.app_config, public.store_devices, public.sync_rows, public.leads from anon;

-- ---------------------------------------------------------------------
-- Funciones para la app de la bodega
-- ---------------------------------------------------------------------

-- Estado de la licencia de quien está conectado.
-- device_ok: en el plan Básico solo el teléfono activo más antiguo puede vender.
drop function if exists public.get_license();
create or replace function public.get_license(p_device text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s public.stores;
  pr public.profiles;
  first_dev text;
  active int := 0;
begin
  select * into s from public.stores where id = public.my_store_id();
  select * into pr from public.profiles where user_id = auth.uid();
  if s.id is not null then
    select count(*) into active from public.store_devices
     where store_id = s.id and last_seen_at > now() - interval '7 days';
    select device_id into first_dev from public.store_devices
     where store_id = s.id and last_seen_at > now() - interval '7 days'
     order by created_at limit 1;
  end if;
  return jsonb_build_object(
    'server_now', now(),
    'is_admin', public.is_admin(),
    'role', pr.role,
    'session_rev', coalesce(pr.session_rev, 0),
    'terms_version', pr.terms_version,
    'devices_active', active,
    'device_ok', s.id is null or s.plan = 'pro' or p_device is null or first_dev is null or first_dev = p_device,
    'store', case when s.id is null then null else public.store_json(s) end
  );
end;
$$;

-- La app avisa que está viva, registra el teléfono, manda sus números y recibe la licencia
drop function if exists public.heartbeat(jsonb);
create or replace function public.heartbeat(p_stats jsonb default '{}'::jsonb, p_device text default null, p_device_name text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  sid uuid := public.my_store_id();
begin
  update public.stores
     set last_seen_at = now(),
         stats = coalesce(p_stats, '{}'::jsonb)
   where id = sid;
  if sid is not null and p_device is not null then
    insert into public.store_devices (store_id, device_id, name, user_id)
    values (sid, left(p_device, 40), left(p_device_name, 80), auth.uid())
    on conflict (store_id, device_id) do update
      set last_seen_at = now(), name = coalesce(excluded.name, store_devices.name), user_id = auth.uid();
  end if;
  return public.get_license(p_device);
end;
$$;

-- "Usar TuBodega en este teléfono": los demás teléfonos quedan en solo lectura (plan Básico)
create or replace function public.claim_primary_device(p_device text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  sid uuid := public.my_store_id();
begin
  if sid is null then
    raise exception 'sin_bodega';
  end if;
  delete from public.store_devices where store_id = sid and device_id <> p_device;
  update public.store_devices set created_at = now() - interval '1 second' where store_id = sid and device_id = p_device;
  return public.get_license(p_device);
end;
$$;

create or replace function public.unregister_device(p_device text) returns void
language sql volatile security definer set search_path = public as $$
  delete from public.store_devices where store_id = public.my_store_id() and device_id = p_device;
$$;

-- Subir cambios de este teléfono. Cada fila: {"t": tabla, "id": clave, "d": datos, "del": borrado}
create or replace function public.sync_push(p_device text, p_rows jsonb) returns bigint
language plpgsql volatile security definer set search_path = public as $$
declare
  sid uuid := public.my_store_id();
begin
  if sid is null then
    raise exception 'sin_bodega';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
    raise exception 'lote_invalido';
  end if;
  insert into public.sync_rows as sr (store_id, tbl, row_id, data, deleted, device, seq, updated_at)
  select sid, r ->> 't', r ->> 'id',
         case when coalesce((r ->> 'del')::boolean, false) then null else r -> 'd' end,
         coalesce((r ->> 'del')::boolean, false), left(p_device, 40), nextval('public.sync_seq'), now()
    from (
      -- si el mismo registro viene dos veces en el lote, gana la última versión
      select distinct on (e.r ->> 't', e.r ->> 'id') e.r
        from jsonb_array_elements(p_rows) with ordinality as e (r, ord)
       order by e.r ->> 't', e.r ->> 'id', e.ord desc
    ) x (r)
   where r ->> 't' in ('categories', 'products', 'customers', 'sellers', 'sales', 'quotes', 'debtPayments',
                       'stockMoves', 'cashSessions', 'purchases', 'expenses', 'settings')
     and coalesce(r ->> 'id', '') <> ''
  on conflict (store_id, tbl, row_id) do update
    set data = excluded.data, deleted = excluded.deleted, device = excluded.device, seq = excluded.seq, updated_at = now();
  return coalesce((select max(seq) from public.sync_rows where store_id = sid), 0);
end;
$$;

-- Vincular la cuenta recién creada con su bodega usando el código de activación.
-- p_terms: versión de los Términos que la persona aceptó al activar.
drop function if exists public.claim_store(text);
create or replace function public.claim_store(p_code text, p_terms text default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  sid uuid;
begin
  if auth.uid() is null then
    raise exception 'sin_sesion';
  end if;
  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'ya_vinculado';
  end if;
  select id into sid from public.stores
   where activation_code = upper(trim(p_code)) and status <> 'cancelled';
  if sid is null then
    raise exception 'codigo_invalido';
  end if;
  insert into public.profiles (user_id, store_id, role, terms_version, terms_accepted_at)
  values (auth.uid(), sid, case when exists (select 1 from public.profiles where store_id = sid) then 'seller' else 'owner' end,
          left(p_terms, 20), case when p_terms is null then null else now() end);
  update public.stores set activation_code = null where id = sid;
  return public.get_license();
end;
$$;

-- El bodeguero reporta un pago; queda pendiente hasta que el admin lo apruebe
create or replace function public.report_payment(
  p_amount_usd numeric, p_amount_bs numeric, p_method text, p_reference text, p_note text, p_months int default 1
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  sid uuid := public.my_store_id();
  pid uuid;
begin
  if sid is null then
    raise exception 'sin_bodega';
  end if;
  if (select count(*) from public.payments where store_id = sid and status = 'pendiente') >= 5 then
    raise exception 'demasiados_pendientes';
  end if;
  insert into public.payments (store_id, amount_usd, amount_bs, method, reference, note, months, created_by)
  values (sid, p_amount_usd, p_amount_bs, left(p_method, 40), left(p_reference, 80), left(p_note, 300),
          greatest(1, least(coalesce(p_months, 1), 12)), auth.uid())
  returning id into pid;
  return pid;
end;
$$;

-- Aceptar la versión vigente de los Términos (usuarios que activaron antes de que existieran)
create or replace function public.accept_terms(p_version text) returns void
language sql volatile security definer set search_path = public as $$
  update public.profiles set terms_version = left(p_version, 20), terms_accepted_at = now() where user_id = auth.uid();
$$;

-- Datos públicos para la página de presentación y las páginas legales (sin iniciar sesión)
create or replace function public.public_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('whatsapp', whatsapp, 'legal_name', legal_name, 'legal_id', legal_id,
                            'legal_email', legal_email, 'legal_city', legal_city)
    from public.app_config where id = 1;
$$;

create or replace function public.mark_backup() returns void
language sql volatile security definer set search_path = public as $$
  update public.stores set last_backup_at = now() where id = public.my_store_id();
$$;

-- ---------------------------------------------------------------------
-- Funciones del administrador
-- ---------------------------------------------------------------------

create or replace function public.admin_create_store(
  p_name text, p_owner text, p_phone text, p_plan text default 'basico', p_price numeric default 10,
  p_trial_days int default 7, p_referred_code text default null
) returns public.stores
language plpgsql volatile security definer set search_path = public as $$
declare
  s public.stores;
  ref uuid;
begin
  perform public.require_admin();
  if p_referred_code is not null and trim(p_referred_code) <> '' then
    select id into ref from public.stores where referral_code = upper(trim(p_referred_code));
    if ref is null then
      raise exception 'codigo_referido_invalido';
    end if;
  end if;
  insert into public.stores (name, owner_name, phone, plan, monthly_price, status, paid_until, activation_code, referral_code, referred_by)
  values (trim(p_name), p_owner, p_phone, coalesce(p_plan, 'basico'), coalesce(p_price, 10), 'trial',
          now() + make_interval(days => greatest(coalesce(p_trial_days, 7), 0)),
          public.random_code(6), public.random_code(5), ref)
  returning * into s;
  return s;
end;
$$;

create or replace function public.admin_update_store(p_id uuid, p_patch jsonb) returns public.stores
language plpgsql volatile security definer set search_path = public as $$
declare
  s public.stores;
begin
  perform public.require_admin();
  update public.stores set
    name = coalesce(p_patch ->> 'name', name),
    owner_name = case when p_patch ? 'owner_name' then p_patch ->> 'owner_name' else owner_name end,
    phone = case when p_patch ? 'phone' then p_patch ->> 'phone' else phone end,
    rif = case when p_patch ? 'rif' then p_patch ->> 'rif' else rif end,
    address = case when p_patch ? 'address' then p_patch ->> 'address' else address end,
    notes = case when p_patch ? 'notes' then p_patch ->> 'notes' else notes end,
    plan = coalesce(p_patch ->> 'plan', plan),
    monthly_price = coalesce((p_patch ->> 'monthly_price')::numeric, monthly_price),
    status = coalesce(p_patch ->> 'status', status),
    paid_until = coalesce((p_patch ->> 'paid_until')::timestamptz, paid_until)
  where id = p_id
  returning * into s;
  return s;
end;
$$;

create or replace function public.admin_extend(p_id uuid, p_months int) returns public.stores
language plpgsql volatile security definer set search_path = public as $$
declare
  s public.stores;
begin
  perform public.require_admin();
  update public.stores
     set paid_until = greatest(paid_until, now()) + make_interval(days => 30 * p_months),
         status = case when status in ('trial', 'suspended') then 'active' else status end
   where id = p_id
  returning * into s;
  return s;
end;
$$;

-- Aprobar o rechazar un pago reportado. Al aprobar el primer pago de una bodega
-- referida, la bodega que la refirió gana 1 mes gratis.
create or replace function public.admin_review_payment(p_id uuid, p_approve boolean, p_note text default null)
returns public.payments
language plpgsql volatile security definer set search_path = public as $$
declare
  p public.payments;
  s public.stores;
  first_paid boolean;
begin
  perform public.require_admin();
  select * into p from public.payments where id = p_id for update;
  if p.id is null or p.status <> 'pendiente' then
    raise exception 'pago_no_pendiente';
  end if;
  update public.payments
     set status = case when p_approve then 'aprobado' else 'rechazado' end, reviewed_at = now(), review_note = p_note
   where id = p_id
  returning * into p;
  if p_approve then
    select not exists (select 1 from public.payments where store_id = p.store_id and status = 'aprobado' and id <> p.id)
      into first_paid;
    perform public.admin_extend(p.store_id, p.months);
    select * into s from public.stores where id = p.store_id;
    if first_paid and s.referred_by is not null then
      update public.stores
         set free_months = free_months + 1,
             paid_until = greatest(paid_until, now()) + interval '30 days'
       where id = s.referred_by;
    end if;
  end if;
  return p;
end;
$$;

-- Registrar un pago que el admin recibió en persona (queda aprobado de una vez)
create or replace function public.admin_record_payment(
  p_store uuid, p_amount_usd numeric, p_method text, p_reference text, p_months int default 1
) returns public.payments
language plpgsql volatile security definer set search_path = public as $$
declare
  pid uuid;
begin
  perform public.require_admin();
  insert into public.payments (store_id, amount_usd, method, reference, months, created_by)
  values (p_store, p_amount_usd, p_method, p_reference, greatest(1, least(coalesce(p_months, 1), 12)), auth.uid())
  returning id into pid;
  return public.admin_review_payment(pid, true, 'Registrado por el admin');
end;
$$;

create or replace function public.admin_new_activation_code(p_id uuid) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  c text := public.random_code(6);
begin
  perform public.require_admin();
  update public.stores set activation_code = c where id = p_id;
  return c;
end;
$$;

create or replace function public.admin_store_members(p_id uuid)
returns table (user_id uuid, email text, role text, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query
    select p.user_id, u.email::text, p.role, u.last_sign_in_at
      from public.profiles p join auth.users u on u.id = p.user_id
     where p.store_id = p_id
     order by p.created_at;
end;
$$;

-- Cambiar la clave de un usuario de una bodega (cuando la olvida)
create or replace function public.admin_reset_password(p_user uuid, p_password text) returns void
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  perform public.require_admin();
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'clave_corta';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_user) then
    raise exception 'no_es_usuario_de_bodega';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where id = p_user;
end;
$$;

-- Cerrar la sesión de un usuario en todos sus teléfonos
create or replace function public.admin_force_logout(p_user uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_admin();
  update public.profiles set session_rev = session_rev + 1 where user_id = p_user;
  begin
    delete from auth.refresh_tokens where user_id = p_user::text;
    delete from auth.sessions where user_id = p_user;
  exception when undefined_table or undefined_column then
    null;
  end;
end;
$$;

-- Quitar un teléfono de una bodega (cambio de teléfono, teléfono perdido)
create or replace function public.admin_remove_device(p_store uuid, p_device text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.store_devices where store_id = p_store and device_id = p_device;
end;
$$;

-- Desvincular un usuario de su bodega (teléfono perdido, empleado que se fue)
create or replace function public.admin_remove_member(p_user uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.profiles where user_id = p_user;
end;
$$;

-- Borrar para siempre una bodega dada de baja o suspendida: sus usuarios, teléfonos,
-- pagos y datos sincronizados. Los respaldos de Storage los borra el panel antes de llamar aquí.
-- p_name debe ser el nombre exacto de la bodega, para evitar borrar otra por error.
create or replace function public.admin_delete_store(p_id uuid, p_name text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  s public.stores;
begin
  perform public.require_admin();
  select * into s from public.stores where id = p_id;
  if s.id is null then
    raise exception 'bodega_no_existe';
  end if;
  if s.status not in ('suspended', 'cancelled') then
    raise exception 'primero_suspender';
  end if;
  if trim(coalesce(p_name, '')) <> trim(s.name) then
    raise exception 'nombre_no_coincide';
  end if;
  -- Las cuentas de sus usuarios (nunca la de un admin)
  begin
    delete from auth.users
     where id in (select user_id from public.profiles where store_id = p_id)
       and id not in (select user_id from public.admins);
  exception when insufficient_privilege then
    null;
  end;
  -- profiles, payments, store_devices y sync_rows se borran en cascada
  delete from public.stores where id = p_id;
end;
$$;

-- Guardar un prospecto (nuevo si no trae id)
create or replace function public.admin_save_lead(p jsonb) returns public.leads
language plpgsql volatile security definer set search_path = public as $$
declare
  l public.leads;
begin
  perform public.require_admin();
  if coalesce(trim(p ->> 'name'), '') = '' then
    raise exception 'falta_nombre';
  end if;
  if p ? 'id' and p ->> 'id' is not null then
    update public.leads set
      name = trim(p ->> 'name'),
      contact = p ->> 'contact',
      phone = p ->> 'phone',
      zone = p ->> 'zone',
      status = coalesce(p ->> 'status', status),
      next_at = nullif(p ->> 'next_at', '')::date,
      notes = p ->> 'notes',
      store_id = case when p ? 'store_id' then nullif(p ->> 'store_id', '')::uuid else store_id end,
      updated_at = now()
    where id = (p ->> 'id')::uuid
    returning * into l;
  else
    insert into public.leads (name, contact, phone, zone, status, next_at, notes, store_id)
    values (trim(p ->> 'name'), p ->> 'contact', p ->> 'phone', p ->> 'zone', coalesce(p ->> 'status', 'nuevo'),
            nullif(p ->> 'next_at', '')::date, p ->> 'notes', nullif(p ->> 'store_id', '')::uuid)
    returning * into l;
  end if;
  return l;
end;
$$;

create or replace function public.admin_delete_lead(p_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.leads where id = p_id;
end;
$$;

-- Permisos de ejecución
revoke execute on all functions in schema public from anon, public;
grant execute on function
  public.get_license(text), public.heartbeat(jsonb, text, text), public.claim_store(text, text),
  public.accept_terms(text), public.admin_delete_store(uuid, text),
  public.admin_save_lead(jsonb), public.admin_delete_lead(uuid),
  public.claim_primary_device(text), public.unregister_device(text), public.sync_push(text, jsonb),
  public.admin_remove_device(uuid, text),
  public.report_payment(numeric, numeric, text, text, text, int), public.mark_backup(),
  public.admin_create_store(text, text, text, text, numeric, int, text), public.admin_update_store(uuid, jsonb),
  public.admin_extend(uuid, int), public.admin_review_payment(uuid, boolean, text),
  public.admin_record_payment(uuid, numeric, text, text, int), public.admin_new_activation_code(uuid),
  public.admin_store_members(uuid), public.admin_reset_password(uuid, text), public.admin_remove_member(uuid),
  public.admin_force_logout(uuid),
  public.is_admin(), public.my_store_id()
to authenticated;
grant execute on function public.public_info() to anon, authenticated;

-- Avisos en tiempo real cuando otro teléfono sube cambios
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sync_rows') then
    alter publication supabase_realtime add table public.sync_rows;
  end if;
exception when undefined_object then
  null;
end;
$$;

-- ---------------------------------------------------------------------
-- Respaldos en la nube (Storage): carpeta por bodega
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('backups', 'backups', false)
on conflict (id) do nothing;

drop policy if exists backups_select on storage.objects;
create policy backups_select on storage.objects for select to authenticated
  using (bucket_id = 'backups' and ((storage.foldername(name))[1] = public.my_store_id()::text or public.is_admin()));

drop policy if exists backups_insert on storage.objects;
create policy backups_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = public.my_store_id()::text);

drop policy if exists backups_update on storage.objects;
create policy backups_update on storage.objects for update to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = public.my_store_id()::text)
  with check (bucket_id = 'backups' and (storage.foldername(name))[1] = public.my_store_id()::text);

-- El admin puede borrar los respaldos de una bodega cuando la elimina
drop policy if exists backups_delete on storage.objects;
create policy backups_delete on storage.objects for delete to authenticated
  using (bucket_id = 'backups' and public.is_admin());

-- ---------------------------------------------------------------------
-- Tu usuario administrador.
-- Primero crea el usuario en Authentication → Users → Add user (con "Auto Confirm User"),
-- luego ejecuta este archivo (o solo esta línea si ya lo habías ejecutado).
-- ---------------------------------------------------------------------

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'alejandrolamont77@gmail.com'
on conflict (user_id) do nothing;
