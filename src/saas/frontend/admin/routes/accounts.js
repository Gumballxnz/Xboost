import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
