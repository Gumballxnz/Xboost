import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to verify if user is an admin
export async function verifyAdmin(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ error: 'Token administrativo não fornecido' });

    try {
        // 1. Verify user exists in 'users' table (via Supabase Auth potentially if used, or our custom table)
        // Here assuming we fetch by ID from token payload decoded in main server.js
        // But main server.js middleware puts user in req.user

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Sessão inválida' });
        }

        // 2. Check Role in admin_users or users table metadata
        // We defined 'admin_users' table in schema, but linking to main users is better.
        // Let's check 'admin_users' for email match

        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', req.user.email)
            .single();

        if (error || !admin) {
            console.log(`Access denied for ${req.user.email}`);
            return res.status(403).json({ error: 'Acesso negado: Você não é administrador' });
        }

        req.admin = admin; // Attach admin info
        next();
    } catch (error) {
        console.error('Admin Auth Error:', error);
        res.status(500).json({ error: 'Erro interno na autenticação' });
    }
}
