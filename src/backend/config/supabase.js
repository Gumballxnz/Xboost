
require('dotenv').config({ path: '../../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Service Role Key para Backend (NUNCA expor no front)

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase URL/Key missing in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
