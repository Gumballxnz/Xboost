import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs'; // Using bcryptjs as in server.js
import dotenv from 'dotenv';
import path from 'path';
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

async function createAdmin() {
    const email = 'ghostgumball39@gmail.com';
    const password = 'Roman700';

    console.log(`👤 Creating Admin: ${email}`);

    // 1. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Check/Create in 'users' table (Auth)
    let { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (!user) {
        console.log("Creating new user record...");
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email,
                password: hashedPassword,
                name: 'Ghost Gumball',
                provider: 'email',
                credits: 9999, // Admin perk
                plan: 'admin',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (createError) {
            console.error("Error creating user:", createError);
            return;
        }
        user = newUser;
    } else {
        console.log("User already exists. Updating password/plan...");
        await supabase
            .from('users')
            .update({
                password: hashedPassword,
                plan: 'admin',
                credits: 9999
            })
            .eq('id', user.id);
    }

    // 3. Add to 'admin_users' table (RBAC)
    // First check if table exists (handled by try/catch or just insert)
    // admin_users table structure: id (uuid), user_id (uuid references users.id), created_at

    // Check if duplicate
    const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!existingAdmin) {
        const { error: adminError } = await supabase
            .from('admin_users')
            .insert({
                user_id: user.id
            });

        if (adminError) {
            console.error("Error adding to admin_users table:", adminError);
            console.log("⚠️ Make sure 'admin_users' table exists! Run the SQL schema.");
        } else {
            console.log("✅ Admin privileges granted successfully.");
        }
    } else {
        console.log("✅ User is already an admin.");
    }
}

createAdmin();
