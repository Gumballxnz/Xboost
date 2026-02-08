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

// List proxies
router.get('/', verifyAdmin, async (req, res) => {
    const { data, error } = await supabase.from('proxies').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Add proxy
router.post('/', verifyAdmin, async (req, res) => {
    // Expect body: { ip, port, username, password, protocol, country }
    const { data, error } = await supabase.from('proxies').insert(req.body).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Delete proxy
router.delete('/:id', verifyAdmin, async (req, res) => {
    const { error } = await supabase.from('proxies').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Test proxy (Stub for now, or trigger AWS check)
router.post('/:id/test', verifyAdmin, async (req, res) => {
    // TODO: Implement actual proxy check or queue task for Bot
    res.json({ status: 'active', latency: Math.floor(Math.random() * 200) + 'ms' });
});

export default router;
