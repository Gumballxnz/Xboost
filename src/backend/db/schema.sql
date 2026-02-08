
-- Habilitar extensão UUID e pgcrypto para hash de senha
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. Tabela de Usuários (Users)
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  username text unique, -- Opcional para login alternativo
  password_hash text, -- NULL se login via OAuth
  name text,
  avatar_url text,
  provider text, -- 'github', 'google', 'email'
  provider_id text,
  email_verified boolean default false, -- Verificação de email
  credits int default 5,
  plan text default 'free', -- 'free', 'starter', 'pro', 'business'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabela de Códigos de Verificação (Verification Codes)
create table public.verification_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  email text not null,
  code text not null, -- Código de 6 dígitos
  type text default 'email_verify', -- 'email_verify', 'password_reset'
  expires_at timestamp with time zone not null,
  used boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Tabela de Campanhas (Campaigns)
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) not null,
  post_url text not null,
  comment_count int not null,
  status text default 'queued', -- 'queued', 'processing', 'completed', 'failed'
  cost int not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone
);

-- 4. Tabela de Transações (Transactions)
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) not null,
  amount int not null, -- Positivo (compra), Negativo (gasto)
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices para performance
create index idx_users_email on public.users(email);
create index idx_users_username on public.users(username);
create index idx_verification_codes_email on public.verification_codes(email);

-- Segurança (RLS - Row Level Security)
alter table public.users enable row level security;
alter table public.campaigns enable row level security;
alter table public.verification_codes enable row level security;

