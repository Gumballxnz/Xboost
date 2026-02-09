// Rule 06: Clean Architecture - Business Logic in Services
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

// Rule 01: Security Isolation - No Service Role in Front (but here in backend service it's OK if needed, though we use anon key by default logic)
// But for admin ops we might need service key.
// Let's use the standard key first.

const supabase = createClient(config.supabase.url, config.supabase.key);

class AuthService {
    async register(userData) {
        const { email, password, name, username } = userData;

        // Rule 03: Multi-tenant Shield - Check existing
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            throw new Error('Email já cadastrado');
        }

        // Rule 07: Credential Hygiene
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            password_hash: hashedPassword,
            name: name || email.split('@')[0],
            username: username || email.split('@')[0],
            credits: 5,
            plan: 'free',
            provider: 'email',
            avatar_url: null,
            created_at: new Date().toISOString()
        };

        const { data: user, error } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (error) throw new Error(`Database Error: ${error.message}`);

        return this.generateToken(user);
    }

    async login(email, password) {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) throw new Error('Credenciais inválidas');

        if (!user.password_hash) throw new Error('Use login social');

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new Error('Credenciais inválidas');

        return this.generateToken(user);
    }

    generateToken(user) {
        const token = jwt.sign(
            { id: user.id, email: user.email },
            config.jwtSecret,
            { expiresIn: '7d' } // Rule 05: Session Hardening (Consider shorter + refresh)
        );

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                credits: user.credits
            }
        };
    }
}

export default new AuthService();
