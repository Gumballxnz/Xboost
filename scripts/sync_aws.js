import { createClient } from '@supabase/supabase-js';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL or SUPABASE_KEY missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProxies() {
    console.log("🔄 Syncing Proxies...");
    const { data, error } = await supabase
        .from('proxies')
        .select('*')
        .eq('status', 'active');

    if (error) {
        console.error("Error fetching proxies:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("⚠️ No active proxies found in DB.");
        return;
    }

    // Format: ip:port:user:pass or ip:port
    const lines = data.map(p => {
        if (p.username && p.password) {
            return `${p.ip}:${p.port}:${p.username}:${p.password}`;
        }
        return `${p.ip}:${p.port}`;
    });

    const content = lines.join('\n');
    await fs.writeFile(path.join(rootDir, 'config', 'proxies.txt'), content);
    console.log(`✅ Updated proxies.txt with ${lines.length} proxies.`);
}

async function syncAccounts() {
    console.log("🔄 Syncing Accounts...");
    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('status', 'active');

    if (error) {
        console.error("Error fetching accounts:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("⚠️ No active accounts found in DB.");
        return;
    }

    // Map DB fields to JSON fields
    const formattedAccounts = data.map(acc => ({
        username: acc.username,
        password: acc.password,
        email: acc.email || acc.username, // Fallback if email missing
        status: acc.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        created_at: acc.created_at || new Date().toISOString(),
        cookies: acc.cookies || [] // Ensure cookies is an array
    }));

    await fs.writeJson(path.join(rootDir, 'config', 'twitter-accounts.json'), formattedAccounts, { spaces: 4 });
    console.log(`✅ Updated twitter-accounts.json with ${formattedAccounts.length} accounts.`);
}

async function main() {
    console.log("🚀 Starting AWS Sync...");
    await syncProxies();
    await syncAccounts();
    console.log("🏁 Sync Completed.");
}

main();
