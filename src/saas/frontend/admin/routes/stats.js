import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
