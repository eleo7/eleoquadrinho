-- Run once in the Supabase SQL editor before deploying the application.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login text not null unique check (login ~ '^[a-z0-9_-]{3,32}$'),
  email text not null,
  nome text not null,
  bio text not null default '',
  avatar text not null default '',
  role text not null default 'reader' check (role in ('reader', 'admin')),
  created_at timestamptz not null default now()
);
create table public.reader_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}',
  revision bigint not null default 0
);
create table public.catalog (
  id integer primary key check (id = 1),
  data jsonb not null default '{}',
  revision bigint not null default 0
);
insert into public.catalog(id) values (1);

-- Browser clients cannot read private emails, edit roles, or bypass the API.
alter table public.profiles enable row level security;
alter table public.reader_state enable row level security;
alter table public.catalog enable row level security;
revoke all on public.profiles, public.reader_state, public.catalog from anon, authenticated;
grant all on public.profiles, public.reader_state, public.catalog to service_role;

create function public.create_reader_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare account_login text := lower(trim(new.raw_user_meta_data->>'login'));
begin
  if account_login is null or account_login !~ '^[a-z0-9_-]{3,32}$' then
    raise exception 'Invalid login';
  end if;
  if account_login = 'eleo7' and coalesce(new.raw_app_meta_data->>'role', '') <> 'admin' then
    raise exception 'Reserved login';
  end if;
  insert into public.profiles(id, login, email, nome, role)
  values (new.id, account_login, new.email,
    left(coalesce(nullif(new.raw_user_meta_data->>'nome', ''), account_login), 80),
    case when new.raw_app_meta_data->>'role' = 'admin' then 'admin' else 'reader' end);
  insert into public.reader_state(user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_reader_profile();

create function public.sync_account_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
create trigger on_auth_email_changed after update of email on auth.users
for each row execute procedure public.sync_account_email();

-- Atomic compare-and-swap prevents silent overwrites from another device.
-- Called only by the trusted server; account_id is never accepted from a browser.
create function public.save_account_data(account_id uuid, is_catalog boolean, expected_revision bigint, new_data jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare next_revision bigint;
begin
  if jsonb_typeof(new_data) <> 'object' or octet_length(new_data::text) > 2000000 then
    raise exception 'Invalid data';
  end if;
  if is_catalog then
    if not exists(select 1 from public.profiles where id = account_id and role = 'admin') then
      raise exception 'Admin required';
    end if;
    update public.catalog set data = new_data, revision = revision + 1
      where id = 1 and revision = expected_revision returning revision into next_revision;
  else
    update public.reader_state set data = new_data, revision = revision + 1
      where user_id = account_id and revision = expected_revision returning revision into next_revision;
  end if;
  return next_revision;
end;
$$;
revoke all on function public.create_reader_profile(), public.sync_account_email(), public.save_account_data(uuid, boolean, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.save_account_data(uuid, boolean, bigint, jsonb) to service_role;
commit;
