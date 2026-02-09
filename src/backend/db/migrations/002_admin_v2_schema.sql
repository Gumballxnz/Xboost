-- Migration: Admin 2.0 Schema (Proxies, Accounts, Invites)

-- 1. Proxies Table
create table if not exists public.proxies (
    id uuid primary key default uuid_generate_v4(),
    ip text not null,
    port int not null,
    protocol text default 'http', -- http, https, socks4, socks5
    username text,
    password text,
    status text default 'active', -- active, dead, slow
    last_checked_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Bot Accounts Table
create table if not exists public.bot_accounts (
    id uuid primary key default uuid_generate_v4(),
    username text unique not null,
    password_hash text,
    email text,
    cookies jsonb,
    proxy_id uuid references public.proxies(id),
    status text default 'ready', -- ready, busy, banned, locked
    last_active_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Admin Invites Table
create table if not exists public.admin_invites (
    id uuid primary key default uuid_generate_v4(),
    email text not null,
    token text unique not null,
    status text default 'pending', -- pending, used, revoked
    expires_at timestamp with time zone not null,
    created_by uuid references public.admin_users(id),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Update Admin Users for OTP
-- Use 'do' block to avoid errors if columns exist
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='admin_users' and column_name='otp_code') then
        alter table public.admin_users add column otp_code text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='admin_users' and column_name='otp_expires_at') then
        alter table public.admin_users add column otp_expires_at timestamp with time zone;
    end if;
     if not exists (select 1 from information_schema.columns where table_name='admin_users' and column_name='is_super_admin') then
        alter table public.admin_users add column is_super_admin boolean default false;
    end if;
end $$;

-- 5. RLS Policies (Rule 03)
alter table public.proxies enable row level security;
alter table public.bot_accounts enable row level security;
alter table public.admin_invites enable row level security;

-- Policies (Allow authenticated users/admins to read/write)
-- Dropping existing policies to ensure idempotency
drop policy if exists "Admins can manage proxies" on public.proxies;
create policy "Admins can manage proxies" on public.proxies for all to authenticated using (true);

drop policy if exists "Admins can manage accounts" on public.bot_accounts;
create policy "Admins can manage accounts" on public.bot_accounts for all to authenticated using (true);

drop policy if exists "Admins can manage invites" on public.admin_invites;
create policy "Admins can manage invites" on public.admin_invites for all to authenticated using (true);
