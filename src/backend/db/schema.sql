
-- Habilitar extensão UUID
create extension if not exists "uuid-ossp";

-- 1. Tabela de Usuários (Users)
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text,
  avatar_url text,
  provider text, -- 'github', 'google', 'email'
  provider_id text,
  credits int default 5, -- 50 créditos grátis no cadastro? O front diz 5.
  plan text default 'free', -- 'free', 'starter', 'pro', 'business'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabela de Campanhas (Campaigns)
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

-- 3. Tabela de Transações (Transactions - Opcional para MVP, mas bom para audit)
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) not null,
  amount int not null, -- Positivo (compra), Negativo (gasto)
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Segurança (RLS - Row Level Security) - Opcional se só o backend acessa via Service Role
alter table public.users enable row level security;
alter table public.campaigns enable row level security;

-- Policies (Exemplo)
-- create policy "Users can view own data" on public.users for select using (auth.uid() = id);
