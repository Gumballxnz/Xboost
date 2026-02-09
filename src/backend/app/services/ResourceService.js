import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

class ResourceService {
    // --- Proxies ---
    async listProxies(limit = 50, offset = 0) {
        const { data, error, count } = await supabase
            .from('proxies')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw new Error(error.message);
        return { data, count };
    }

    async addProxy(proxyData) {
        // proxyData: { ip, port, protocol, username, password }
        const { data, error } = await supabase
            .from('proxies')
            .insert([proxyData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async deleteProxy(id) {
        const { error } = await supabase
            .from('proxies')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return { success: true };
    }

    // --- Bot Accounts ---
    async listAccounts(limit = 50, offset = 0) {
        const { data, error, count } = await supabase
            .from('bot_accounts')
            .select('*, proxies(ip, port)', { count: 'exact' }) // Join with proxies
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw new Error(error.message);
        return { data, count };
    }

    async addAccount(accountData) {
        const { data, error } = await supabase
            .from('bot_accounts')
            .insert([accountData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async deleteAccount(id) {
        const { error } = await supabase
            .from('bot_accounts')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return { success: true };
    }
}

export default new ResourceService();
