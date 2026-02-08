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

// List accounts
router.get('/', verifyAdmin, async (req, res) => {
    const { data, error } = await supabase.from('bot_accounts').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Add account
router.post('/', verifyAdmin, async (req, res) => {
    const { data, error } = await supabase.from('bot_accounts').insert(req.body).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Update account status
router.put('/:id', verifyAdmin, async (req, res) => {
    const { data, error } = await supabase.from('bot_accounts').update(req.body).eq('id', req.params.id).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

export default router;
