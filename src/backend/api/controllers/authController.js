
const supabase = require('../../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://xboost-zeta.vercel.app';

// Configuração do Nodemailer (usando Supabase ou SMTP genérico)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Gerar código de 6 dígitos
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== OAUTH (Existente) ====================

exports.findOrCreateUser = async (profile) => {
    const { id, provider, emails, displayName, username, photos } = profile;
    const email = emails && emails.length > 0 ? emails[0].value : `${id}@${provider}.com`;
    const name = displayName || username || 'User';
    const avatar = photos && photos.length > 0 ? photos[0].value : null;

    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (existingUser) {
        return existingUser;
    }

    const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
            email,
            name,
            avatar_url: avatar,
            provider,
            provider_id: id,
            email_verified: true, // OAuth já verifica
            credits: 5,
            plan: 'free'
        }])
        .select()
        .single();

    if (error) throw error;
    return newUser;
};

exports.loginSuccess = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication failed' });
    }

    const token = jwt.sign(
        { sub: req.user.id, email: req.user.email, role: req.user.plan || 'free' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.redirect(`${FRONTEND_URL}/?token=${token}`);
};

exports.loginFailure = (req, res) => {
    res.status(401).json({ error: 'Login failed' });
};

exports.logout = (req, res) => {
    req.logout(() => { });
    res.redirect('/');
};

// ==================== EMAIL/PASSWORD AUTH (Novo) ====================

// Registrar novo usuário com email/senha
exports.register = async (req, res) => {
    try {
        const { email, password, name, username } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
        }

        // Verificar se email já existe
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: 'Email já cadastrado' });
        }

        // Verificar se username já existe (se fornecido)
        if (username) {
            const { data: existingUsername } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .single();

            if (existingUsername) {
                return res.status(409).json({ error: 'Nome de usuário já existe' });
            }
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Criar usuário
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                email,
                username: username || null,
                password_hash: passwordHash,
                name,
                provider: 'email',
                email_verified: false,
                credits: 5,
                plan: 'free'
            }])
            .select()
            .single();

        if (error) throw error;

        // Gerar código de verificação
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await supabase.from('verification_codes').insert([{
            user_id: newUser.id,
            email,
            code,
            type: 'email_verify',
            expires_at: expiresAt.toISOString()
        }]);

        // Enviar email com código
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER || 'noreply@xboost.com',
                to: email,
                subject: 'XBoost - Código de Verificação',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; background: #18181b; color: white; border-radius: 16px;">
                        <h2 style="color: #10b981;">⚡ XBoost</h2>
                        <p>Olá ${name}!</p>
                        <p>Seu código de verificação é:</p>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            ${code}
                        </div>
                        <p style="color: #a1a1aa; font-size: 12px;">Este código expira em 15 minutos.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Erro ao enviar email:', emailError);
            // Continua mesmo se o email falhar (código pode ser visto no banco para debug)
        }

        res.status(201).json({
            message: 'Usuário criado! Verifique seu email.',
            userId: newUser.id,
            email: newUser.email
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};

// Verificar código de email
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: 'Email e código são obrigatórios' });
        }

        // Buscar código válido
        const { data: verification } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('code', code)
            .eq('type', 'email_verify')
            .eq('used', false)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!verification) {
            return res.status(400).json({ error: 'Código inválido ou expirado' });
        }

        // Marcar como usado
        await supabase
            .from('verification_codes')
            .update({ used: true })
            .eq('id', verification.id);

        // Marcar email como verificado
        await supabase
            .from('users')
            .update({ email_verified: true })
            .eq('id', verification.user_id);

        // Gerar token JWT
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', verification.user_id)
            .single();

        const token = jwt.sign(
            { sub: user.id, email: user.email, role: user.plan || 'free' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Email verificado com sucesso!',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                credits: user.credits
            }
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Erro ao verificar código' });
    }
};

// Login com email ou username
exports.login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.status(400).json({ error: 'Email/usuário e senha são obrigatórios' });
        }

        // Buscar usuário por email ou username
        let query = supabase.from('users').select('*');

        if (emailOrUsername.includes('@')) {
            query = query.eq('email', emailOrUsername);
        } else {
            query = query.eq('username', emailOrUsername);
        }

        const { data: user } = await query.single();

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        if (!user.password_hash) {
            return res.status(401).json({ error: 'Use o login social (GitHub/Google) para esta conta' });
        }

        // Verificar senha
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // Verificar se email está verificado
        if (!user.email_verified) {
            return res.status(403).json({
                error: 'Email não verificado',
                needsVerification: true,
                email: user.email
            });
        }

        // Gerar token
        const token = jwt.sign(
            { sub: user.id, email: user.email, role: user.plan || 'free' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                username: user.username,
                credits: user.credits,
                plan: user.plan
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

// Reenviar código de verificação
exports.resendCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const { data: user } = await supabase
            .from('users')
            .select('id, name, email_verified')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email já foi verificado' });
        }

        // Gerar novo código
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await supabase.from('verification_codes').insert([{
            user_id: user.id,
            email,
            code,
            type: 'email_verify',
            expires_at: expiresAt.toISOString()
        }]);

        // Enviar email
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER || 'noreply@xboost.com',
                to: email,
                subject: 'XBoost - Novo Código de Verificação',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; background: #18181b; color: white; border-radius: 16px;">
                        <h2 style="color: #10b981;">⚡ XBoost</h2>
                        <p>Seu novo código de verificação é:</p>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #27272a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            ${code}
                        </div>
                        <p style="color: #a1a1aa; font-size: 12px;">Este código expira em 15 minutos.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Erro ao enviar email:', emailError);
        }

        res.json({ message: 'Novo código enviado!' });

    } catch (error) {
        console.error('Resend code error:', error);
        res.status(500).json({ error: 'Erro ao reenviar código' });
    }
};
