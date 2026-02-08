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

router.get('/', verifyAdmin, async (req, res) => {
    try {
        const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: campaigns } = await supabase.from('campaigns').select('*', { count: 'exact', head: true });
        const { count: pendingCampaigns } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'running');
        const { count: proxies } = await supabase.from('proxies').select('*', { count: 'exact', head: true });
        const { count: activeAccounts } = await supabase.from('bot_accounts').select('*', { count: 'exact', head: true }).eq('status', 'active');

        res.json({
            users,
            campaigns,
            pendingCampaigns,
            proxies,
            activeAccounts,
            revenue: users * 0 // Placeholder
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
