import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '../admin/middleware/auth.js';

const router = express.Router();
// FAIL-SAFE: Create client only if keys exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : { from: () => ({ select: () => ({ eq: () => ({ single: () => ({ error: { message: 'Supabase Keys Missing' } }) }) }) }) };

// List users
router.get('/', verifyAdmin, async (req, res) => {
    const { data: users, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(users);
});

// Update user credits/plan
router.put('/:id', verifyAdmin, async (req, res) => {
    const { credits, plan, status } = req.body;
    const { data, error } = await supabase
        .from('users')
        .update({ credits, plan, status })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

export default router;
