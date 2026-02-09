import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

// Rule 01: Security Isolation - Admin operations might need Service Role if available
const supabaseKey = config.supabase.serviceKey || config.supabase.key;
const supabase = createClient(config.supabase.url, supabaseKey);

class AdminService {
    async isAdmin(email) {
        // Optimistic check: if 'admin_users' table doesn't exist, we might fallback or fail safe (Rule 08)
        try {
            const { data } = await supabase
                .from('admin_users')
                .select('email')
                .eq('email', email)
                .single();
            return !!data;
        } catch (e) {
            console.error('Admin Check Error:', e.message);
            return false;
        }
    }

    async listUsers(limit = 10, offset = 0) {
        const { data, error, count } = await supabase
            .from('users')
            .select('*', { count: 'exact' })
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return { users: data, total: count };
    }

    async getStats() {
        // Parallel Async (Rule 02)
        const [users, campaigns] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('campaigns').select('id', { count: 'exact', head: true }) // Assuming 'campaigns' table
        ]);

        return {
            totalUsers: users.count,
            totalCampaigns: campaigns.count
        };
    }
}

export default new AdminService();
