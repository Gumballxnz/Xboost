import { createClient } from '@supabase/supabase-js';

// Supabase credentials (service role key for admin operations)
const supabaseUrl = 'https://mclwqrweybyemzetlyke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbHdxcndleWJ5ZW16ZXRseWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ5NzM4NSwiZXhwIjoyMDg2MDczMzg1fQ.3JOoABqnMckuQ-Dtq4_xu--RH_R0vAPBBQqu_IG4220';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
    const email = 'ghostgumball39@gmail.com';
    const password = 'Roman700';
    const name = 'Admin';
    const username = 'admin';

    console.log('🔐 Criando usuário admin via Supabase Auth...');

    try {
        // First, try to create user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                name,
                username,
                role: 'admin'
            }
        });

        if (authError) {
            if (authError.message.includes('already been registered')) {
                console.log('⚠️ Usuário já existe no Auth. Verificando tabela users...');
            } else {
                console.log('Auth Error:', authError.message);
            }
        } else {
            console.log('✅ Usuário criado no Supabase Auth!');
            console.log('   Auth ID:', authData.user.id);
        }

        // Now check/update the users table
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            console.log('⚠️ Atualizando usuário existente para admin...');
            const { error } = await supabase
                .from('users')
                .update({
                    role: 'admin',
                    plan: 'business',
                    credits: 999999,
                    name,
                    username
                })
                .eq('email', email);

            if (error) {
                console.log('Update Error:', error.message);
            } else {
                console.log('✅ Usuário atualizado para admin!');
            }
        } else {
            // Create user in users table without password (uses Supabase Auth)
            console.log('📝 Criando entrada na tabela users...');
            const { data, error } = await supabase
                .from('users')
                .insert({
                    email,
                    name,
                    username,
                    credits: 999999,
                    plan: 'business',
                    role: 'admin',
                    provider: 'email',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.log('Insert Error:', error.message);
                console.log('Tentando sem campos opcionais...');

                // Try with minimal fields
                const { data: minData, error: minError } = await supabase
                    .from('users')
                    .insert({
                        email,
                        name
                    })
                    .select()
                    .single();

                if (minError) {
                    console.log('Minimal Insert Error:', minError.message);
                } else {
                    console.log('✅ Admin criado com dados mínimos!', minData.id);
                }
            } else {
                console.log('✅ Admin criado com sucesso!');
                console.log('   ID:', data.id);
            }
        }

        console.log('\n📋 Credenciais de Acesso:');
        console.log('   Email:', email);
        console.log('   Senha:', password);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

createAdminUser();
