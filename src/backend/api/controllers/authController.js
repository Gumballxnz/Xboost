
const supabase = require('../../config/supabase');

// Função auxiliar para criar ou buscar usuário
exports.findOrCreateUser = async (profile) => {
    const { id, provider, emails, displayName, username, photos } = profile;
    const email = emails && emails.length > 0 ? emails[0].value : `${id}@${provider}.com`;
    const name = displayName || username || 'User';
    const avatar = photos && photos.length > 0 ? photos[0].value : null;

    // Verificar se usuário existe
    const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (existingUser) {
        // Atualizar avatar se mudou (opcional)
        return existingUser;
    }

    // Criar novo usuário
    const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
            email,
            name,
            avatar_url: avatar,
            provider,
            provider_id: id,
            credits: 5, // Bônus inicial
            plan: 'free'
        }])
        .select()
        .single();

    if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
    }

    return newUser;
};

// ... (Resto do controller de login - loginSuccess, loginFailure, logout)
// Vou reescrever o arquivo todo para garantir consistência
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';

exports.loginSuccess = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication failed' });
    }

    // Gerar JWT com dados do Supabase
    const token = jwt.sign(
        {
            sub: req.user.id,
            email: req.user.email,
            role: req.user.plan || 'free'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    res.redirect(`${frontendUrl}/?token=${token}`); // Redireciona para raiz que o app.js trata
};

exports.loginFailure = (req, res) => {
    res.status(401).json({ error: 'Login failed' });
};

exports.logout = (req, res) => {
    req.logout();
    res.redirect('/');
};
