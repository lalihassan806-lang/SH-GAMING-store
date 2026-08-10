-- SH GAMING STORE — 02-functions.sql
-- Run the parts IN ORDER (01 then 02 ...). Each is safe to re-run.

-- ============================================================
-- HELPERS
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ------------------------------------------------------------
-- PROFILE COLUMN GUARD
-- RLS gates *which row* you may update but not *which column*. Without this
-- guard any signed-in user could PATCH their own profiles row over the REST
-- API and set role='admin' or wallet=999999. This trigger reverts privileged
-- columns for non-admin callers.
--
-- Trusted server-side functions that legitimately move money
-- (checkout_with_wallet, approve_topup) set app.bypass_profile_guard for
-- the duration of their transaction.
-- ------------------------------------------------------------
create or replace function public.guard_profile_columns()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- Trusted function opted out for this transaction.
  if coalesce(current_setting('app.bypass_profile_guard', true), 'off') = 'on' then
    return new;
  end if;

  -- No JWT = service-role key or SQL editor; RLS already limits reachable rows.
  if auth.uid() is null then
    return new;
  end if;

  -- Admins may edit anything.
  if public.is_admin() then
    return new;
  end if;

  -- Everyone else: privileged columns are immutable.
  new.id         := old.id;
  new.email      := old.email;
  new.role       := old.role;
  new.wallet     := old.wallet;
  new.banned     := old.banned;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
