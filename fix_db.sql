-- ============================================================
-- SCRIPT DE CORREÇÃO DO BANCO DE DADOS (XBOOST)
-- Rode este script no Editor SQL do Supabase
-- ============================================================

-- 1. Adicionar colunas que faltam (se não existirem)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Corrigir nomes antigos (se existirem)
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
    ALTER TABLE public.users RENAME COLUMN "password" TO password_hash;
  END IF;
  
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar') THEN
    ALTER TABLE public.users RENAME COLUMN "avatar" TO avatar_url;
  END IF;
END $$;

-- 3. Confirmar que a coluna credits existe (padrão 5)
ALTER TABLE public.users 
ALTER COLUMN credits SET DEFAULT 5;

-- 4. Criar Política de Segurança para os Usuários (Permitir Select/Insert/Update)
-- Isso evita erro de "row level security policy violation"
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
