import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
// Try loading from .env.local if .env missing or incomplete
dotenv.config({ path: path.join(__dirname, 'src/saas/xboost-saas/.env.local') });

const supabaseUrl = 'https://mclwqrweybyemzetlyke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbHdxcndleWJ5ZW16ZXRseWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ5NzM4NSwiZXhwIjoyMDg2MDczMzg1fQ.3JOoABqnMckuQ-Dtq4_xu--RH_R0vAPBBQqu_IG4220';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase Credencials missing. Check your .env file.');
    console.error('Need SUPABASE_URL and SUPABASE_KEY (preferably SERVICE_ROLE for admin creation)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAdmin() {
    console.log('🛠️  Setting up Local Admin...');

    const email = 'admin@local.com';
    const password = 'AdminPassword123!'; // Meets complexity rules
    const name = 'Local Admin';

    // 1. Create/Ensure admin_users table exists
    // Note: Usually done via migration, but doing here for quick setup if permissible by RLS/Permissions
    // or assuming it exists. If it fails, user might need to run SQL in Supabase Dashboard.
    console.log('Checking admin_users table...');
    const { error: tableCheck } = await supabase.from('admin_users').select('*').limit(1);

    if (tableCheck && tableCheck.code === '42P01') {
        console.error('❌ Table `admin_users` does not exist.');
        console.error('Please run this SQL in your Supabase SQL Editor:');
        console.log(`
            create table public.admin_users (
                id uuid primary key default uuid_generate_v4(),
                email text unique not null,
                created_at timestamp with time zone default timezone('utc'::text, now())
            );
            alter table public.admin_users enable row level security;
        `);
        // We can't create tables via JS client usually.
    }

    // 2. Create User in `users` table
    console.log(`Creating user ${email}...`);

    // Check if exists
    const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).single();

    if (existingUser) {
        console.log('✅ User already exists in `users` table. Updating password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: hashedPassword })
            .eq('email', email);

        if (updateError) console.error('❌ Error updating password:', updateError);
        else console.log('✅ Password updated successfully.');
    } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const { error: createError } = await supabase.from('users').insert({
            email,
            password_hash: hashedPassword,
            name,
            credits: 9999,
            plan: 'admin',
            provider: 'email',
            created_at: new Date().toISOString()
        });

        if (createError) {
            console.error('❌ Error creating user:', createError);
            return;
        }
        console.log('✅ User created successfully.');
    }

    // 3. Add to `admin_users`
    console.log(`Promoting ${email} to Admin...`);
    const { data: existingAdmin } = await supabase.from('admin_users').select('*').eq('email', email).single();

    if (existingAdmin) {
        console.log('✅ User is already an Admin.');
    } else {
        const { error: adminError } = await supabase.from('admin_users').insert({ email });
        if (adminError) {
            console.error('❌ Error adding to admin_users:', adminError);
            return;
        }
        console.log('✅ User promoted to Admin successfully.');
    }

    console.log('\n🎉 Setup Complete!');
    console.log(`Login with:\nEmail: ${email}\nPassword: ${password}`);
}

setupAdmin();
