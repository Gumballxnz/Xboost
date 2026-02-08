-- ============================================================
-- SCRIPT DE RESET DE SENHA ADMIN (XBOOST)
-- ============================================================

-- Define a senha do admin (ghostgumball39@gmail.com) para: Roman700

UPDATE public.users
SET 
    password_hash = '$2a$10$AknvsB09XJWRJmjF3JrHe.G8OoEDUmurpmuY6k1sFE6VSrQoXtwbC', -- Senha: Roman700
    credits = 9999,
    plan = 'business',
    -- Garante que tem role de admin (se sua tabela usar role, se não, ignora)
    -- role = 'admin', 
    updated_at = now()
WHERE email = 'ghostgumball39@gmail.com';

-- Confirmação (opcional)
SELECT email, plan, credits FROM public.users WHERE email = 'ghostgumball39@gmail.com';
