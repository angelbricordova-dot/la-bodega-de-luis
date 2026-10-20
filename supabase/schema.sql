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
  paid_until timestamptz not null default now() + interval '15 days',
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

create table if not exists public.app_config (
  id int primary key default 1 check (id = 1),
  pago_movil text,
  zelle text,
  binance text,
  whatsapp text,
  updated_at timestamptz not null default now()
);
insert into public.app_config (id) values (1) on conflict (id) do nothing;

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
revoke insert, update, delete on public.stores, public.profiles, public.payments, public.admins from anon, authenticated;
revoke all on public.stores, public.profiles, public.payments, public.admins, public.app_config from anon;

-- ---------------------------------------------------------------------
-- Funciones para la app de la bodega
-- ---------------------------------------------------------------------

-- Estado de la licencia de quien está conectado
create or replace function public.get_license() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s public.stores;
  pr public.profiles;
begin
  select * into s from public.stores where id = public.my_store_id();
  select * into pr from public.profiles where user_id = auth.uid();
  return jsonb_build_object(
    'server_now', now(),
    'is_admin', public.is_admin(),
    'role', pr.role,
    'session_rev', coalesce(pr.session_rev, 0),
    'store', case when s.id is null then null else public.store_json(s) end
  );
end;
$$;

-- La app avisa que está viva, manda sus números y recibe la licencia
create or replace function public.heartbeat(p_stats jsonb default '{}'::jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  update public.stores
     set last_seen_at = now(),
         stats = coalesce(p_stats, '{}'::jsonb)
   where id = public.my_store_id();
  return public.get_license();
end;
$$;

-- Vincular la cuenta recién creada con su bodega usando el código de activación
create or replace function public.claim_store(p_code text) returns jsonb
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
  insert into public.profiles (user_id, store_id, role)
  values (auth.uid(), sid, case when exists (select 1 from public.profiles where store_id = sid) then 'seller' else 'owner' end);
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

create or replace function public.mark_backup() returns void
language sql volatile security definer set search_path = public as $$
  update public.stores set last_backup_at = now() where id = public.my_store_id();
$$;

-- ---------------------------------------------------------------------
-- Funciones del administrador
-- ---------------------------------------------------------------------

create or replace function public.admin_create_store(
  p_name text, p_owner text, p_phone text, p_plan text default 'basico', p_price numeric default 10,
  p_trial_days int default 15, p_referred_code text default null
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
          now() + make_interval(days => greatest(coalesce(p_trial_days, 15), 0)),
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

-- Desvincular un usuario de su bodega (teléfono perdido, empleado que se fue)
create or replace function public.admin_remove_member(p_user uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.profiles where user_id = p_user;
end;
$$;

-- Permisos de ejecución
revoke execute on all functions in schema public from anon, public;
grant execute on function
  public.get_license(), public.heartbeat(jsonb), public.claim_store(text),
  public.report_payment(numeric, numeric, text, text, text, int), public.mark_backup(),
  public.admin_create_store(text, text, text, text, numeric, int, text), public.admin_update_store(uuid, jsonb),
  public.admin_extend(uuid, int), public.admin_review_payment(uuid, boolean, text),
  public.admin_record_payment(uuid, numeric, text, text, int), public.admin_new_activation_code(uuid),
  public.admin_store_members(uuid), public.admin_reset_password(uuid, text), public.admin_remove_member(uuid),
  public.admin_force_logout(uuid),
  public.is_admin(), public.my_store_id()
to authenticated;

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

-- ---------------------------------------------------------------------
-- Tu usuario administrador.
-- Primero crea el usuario en Authentication → Users → Add user (con "Auto Confirm User"),
-- luego ejecuta este archivo (o solo esta línea si ya lo habías ejecutado).
-- ---------------------------------------------------------------------

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'alejandrolamont77@gmail.com'
on conflict (user_id) do nothing;
