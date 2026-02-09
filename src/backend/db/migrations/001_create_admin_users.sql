-- Migration: Create admin_users table (Rule 06 implementation)

create table if not exists public.admin_users (
    id uuid primary key default uuid_generate_v4(),
    email text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS (Rule 03)
alter table public.admin_users enable row level security;

-- Policy: Allow read access to authenticated users (or restriction logic)
-- For now, we allow service_role to manage it. 
-- In a real scenario, you might restrict this further.

create policy "Allow read access for authenticated users"
on public.admin_users
for select
to authenticated
using (true);
