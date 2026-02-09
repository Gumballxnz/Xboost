import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Email Transporter (Configure with Env Vars in production)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use SMTP settings from config
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

class AdminAuthService {
    async requestLogin(email) {
        // 1. Check if admin exists
        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('id, email')
            .eq('email', email)
            .single();

        if (error || !admin) {
            // Security: Fake delay to prevent enumeration, but don't reveal error
            await new Promise(r => setTimeout(r, 1000));
            return { message: 'Se o email existir, um código foi enviado.' };
        }

        // 2. Generate OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 3. Save OTP to DB
        await supabase
            .from('admin_users')
            .update({
                otp_code: otp,
                otp_expires_at: expiresAt.toISOString()
            })
            .eq('id', admin.id);

        // 4. Send Email (Mock in Dev if no creds, Real in Prod)
        if (process.env.EMAIL_USER) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Seu Código de Acesso Admin - Twitter Bot',
                text: `Seu código de verificação é: ${otp}. Válido por 10 minutos.`
            });
        } else {
            console.log(`🔑 [DEV ONLY] OTP for ${email}: ${otp}`);
        }

        return { message: 'Código enviado com sucesso.' };
    }

    async verifyLogin(email, otp) {
        // 1. Get Admin with OTP
        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !admin) throw new Error('Login falhou.');

        // 2. Validate OTP
        const now = new Date();
        const expires = new Date(admin.otp_expires_at);

        if (admin.otp_code !== otp) throw new Error('Código inválido.');
        if (now > expires) throw new Error('Código expirado.');

        // 3. Clear OTP
        await supabase
            .from('admin_users')
            .update({ otp_code: null, otp_expires_at: null })
            .eq('id', admin.id);

        // 4. Generate Token
        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            config.jwtSecret,
            { expiresIn: '24h' }
        );

        return { token, admin: { id: admin.id, email: admin.email } };
    }

    // --- Invites ---
    async createInvite(createdByUserId, email) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const { data, error } = await supabase
            .from('admin_invites')
            .insert([{
                email,
                token,
                expires_at: expiresAt.toISOString(),
                created_by: createdByUserId
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // TODO: Send Email with Invite Link (e.g. https://xboost.com/admin/register?token=...)
        // For now, return the token so the admin can copy it
        return { ...data, invite_link: `${config.supabase.url}/admin/register?token=${token}` };
    }

    async listInvites() {
        const { data, error } = await supabase
            .from('admin_invites')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }
}

export default new AdminAuthService();
