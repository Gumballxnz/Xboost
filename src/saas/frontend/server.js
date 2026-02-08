// =====================================================
// XBOOST SAAS - API Server with OAuth & Supabase
// =====================================================
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Admin Routes - Dynamic to avoid crashes if files are missing
let proxiesRouter = null, accountsRouter = null, usersRouter = null, statsRouter = null;
try {
    proxiesRouter = (await import('./admin/routes/proxies.js')).default;
    accountsRouter = (await import('./admin/routes/accounts.js')).default;
    usersRouter = (await import('./admin/routes/users.js')).default;
    statsRouter = (await import('./admin/routes/stats.js')).default;
    console.log('✅ Admin routes loaded');
} catch (e) {
    console.warn('⚠️ Admin routes not loaded:', e.message);
}

// ================== Supabase Config ==================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL/Key missing. Check environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Queue (BullMQ) - Import conditionally and ONLY if NOT Vercel
let addCampaignJob = null;

// Vercel Serverless optimization: Don't load BullMQ if running in lambda
// or if missing Redis env.
if (!process.env.VERCEL) {
    try {
        const queue = await import('./queue.js');
        addCampaignJob = queue.addCampaignJob;
        console.log('✅ Redis queue connected');
    } catch (e) {
        console.log('⚠️ Redis/Queue skipped (Serverless/Error):', e.message);
    }
} else {
    console.log('⚡ Vercel Environment: Skipping Redis connection to prevent timeout/bloat.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'xboost-secret-change-in-production';
const getBaseUrl = () => {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return `http://localhost:${PORT}`;
};
const BASE_URL = getBaseUrl();

// ================== OAuth Config ==================
const OAUTH_CONFIG = {
    github: {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/github/callback`
    },
    google: {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/google/callback`
    }
};

// ================== SECURITY MIDDLEWARE ==================
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for now (can tighten later)
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Auth UI Routes
app.get(['/auth/sign-in', '/auth/sign-up', '/auth/login', '/auth/register'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});
app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// ================== Passport Serialization ==================
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return done(error, null);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ================== GitHub Strategy ==================
passport.use(new GitHubStrategy(
    OAUTH_CONFIG.github,
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('GitHub Profile:', JSON.stringify(profile)); // Debug log

            // 1. Check if user exists by GitHub ID
            let { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('githubId', profile.id)
                .single();

            if (!user) {
                const email = profile.emails?.[0]?.value || profile._json?.email || `${profile.username}@github.local`;
                const avatar = profile.photos?.[0]?.value || profile._json?.avatar_url;

                // 2. Check if user exists by Email (to link account)
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .single();

                if (existingUser) {
                    console.log(`🔗 Vinculando GitHub ao usuário existente: ${email}`);
                    const { data: updated, error: updateError } = await supabase
                        .from('users')
                        .update({
                            githubId: profile.id,
                            avatar_url: existingUser.avatar_url || avatar // FIX: avatar -> avatar_url
                        })
                        .eq('id', existingUser.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;
                    user = updated;
                } else {
                    // 3. Create new user
                    const newUser = {
                        email: email,
                        name: profile.displayName || profile.username,
                        avatar_url: avatar, // FIX: avatar -> avatar_url
                        githubId: profile.id,
                        provider: 'github',
                        credits: 5,
                        plan: 'free',
                        created_at: new Date().toISOString()
                    };

                    const { data, error } = await supabase
                        .from('users')
                        .insert(newUser)
                        .select()
                        .single();

                    if (error) {
                        console.error('Supabase Insert Error (GitHub):', error);
                        throw error;
                    }
                    user = data;
                    console.log(`🆕 Novo usuário via GitHub: ${user.name}`);
                }
            }
            return done(null, user);
        } catch (err) {
            console.error('GitHub Auth Error:', err);
            return done(err, null);
        }
    }
));

// ================== Google Strategy ==================
passport.use(new GoogleStrategy(
    OAUTH_CONFIG.google,
    async (accessToken, refreshToken, profile, done) => {
        try {
            // 1. Check if user exists by Google ID
            let { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('googleId', profile.id)
                .single();

            if (!user) {
                const email = profile.emails?.[0]?.value || `${profile.id}@google.local`;
                const avatar = profile.photos?.[0]?.value;

                // 2. Check if user exists by Email
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .single();

                if (existingUser) {
                    console.log(`🔗 Vinculando Google ao usuário existente: ${email}`);
                    const { data: updated, error: updateError } = await supabase
                        .from('users')
                        .update({
                            googleId: profile.id,
                            avatar_url: existingUser.avatar_url || avatar // FIX: avatar -> avatar_url
                        })
                        .eq('id', existingUser.id)
                        .select()
                        .single();

                    if (updateError) throw updateError;
                    user = updated;
                } else {
                    // 3. Create new user
                    const newUser = {
                        email: email,
                        name: profile.displayName || profile.name?.givenName,
                        avatar_url: avatar, // FIX: avatar -> avatar_url
                        googleId: profile.id,
                        provider: 'google',
                        credits: 5,
                        plan: 'free',
                        created_at: new Date().toISOString()
                    };

                    const { data, error } = await supabase
                        .from('users')
                        .insert(newUser)
                        .select()
                        .single();

                    if (error) {
                        console.error('Supabase Insert Error (Google):', error);
                        throw error;
                    }
                    user = data;
                    console.log(`🆕 Novo usuário via Google: ${user.name}`);
                }
            }
            return done(null, user);
        } catch (err) {
            console.error('Google Auth Error:', err);
            return done(err, null);
        }
    }
));

// Auth Middleware
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token necessário' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Token inválido' });
    }
}

// ================== ZOD SCHEMAS ==================
const RegisterSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    name: z.string().min(2, 'Nome muito curto').optional(),
    username: z.string().optional(),
});

const LoginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha obrigatória'),
});

// ================== AUTH ROUTES ==================

// Registro
app.post('/api/auth/register', async (req, res) => {
    try {
        // Validate Input
        const { email, password, name, username } = RegisterSchema.parse(req.body);

        // Check existing
        const { data: existing, error: findError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found", which is good here
            console.error('Supabase Find Error:', findError);
            return res.status(500).json({ error: `Erro ao verificar usuário: ${findError.message}` });
        }

        if (existing) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            password_hash: hashedPassword, // FIX: matches schema
            name: name || email.split('@')[0],
            username: username || email.split('@')[0],
            credits: 5,
            plan: 'free',
            provider: 'email',
            avatar_url: null, // FIX: matches schema
            created_at: new Date().toISOString()
        };

        const { data: user, error } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            // DEBUG: Returning full error to client
            return res.status(500).json({ error: `Erro Banco de Dados: ${error.message || error.details}` });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Conta criada! Você ganhou 5 créditos grátis 🎉',
            token,
            user: { id: user.id, email: user.email, name: user.name, credits: user.credits }
        });

    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: err.errors[0].message });
        }
        console.error('Register Error:', err);
        res.status(500).json({ error: `Erro Interno: ${err.message}` });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Email não encontrado ou erro no banco.' });
        }

        // Check if user has password (might be oauth only)
        if (!user.password_hash) { // FIX: password -> password_hash
            return res.status(401).json({ error: 'Esta conta usa login social (Google/GitHub). Por favor, entre por lá.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash); // FIX: password -> password_hash
        if (!valid) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, credits: user.credits }
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: err.errors[0].message });
        }
        console.error('Login Error:', err);
        res.status(500).json({ error: `Erro no Login: ${err.message}` });
    }
});

// Me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error || !user) return res.status(404).json({ error: 'Usuário não encontrado' });

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            credits: user.credits,
            plan: user.plan,
            avatar: user.avatar,
            provider: user.provider
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ================== OAuth Routes ==================
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/?error=github_failed' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.redirect(`/?token=${token}&provider=github`);
    }
);

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=google_failed' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.redirect(`/?token=${token}&provider=google`);
    }
);

// ================== ADMIN ROUTES (Protected) ==================
if (proxiesRouter) app.use('/api/admin/proxies', proxiesRouter);
if (accountsRouter) app.use('/api/admin/accounts', accountsRouter);
if (usersRouter) app.use('/api/admin/users', usersRouter);
if (statsRouter) app.use('/api/admin/stats', statsRouter);

// ================== CAMPAIGN ROUTES ==================

// Criar campanha
app.post('/api/campaigns', authMiddleware, async (req, res) => {
    const { postUrl, commentsCount } = req.body;

    if (!postUrl || !commentsCount) {
        return res.status(400).json({ error: 'URL do post e quantidade são obrigatórios' });
    }

    if (!postUrl.includes('twitter.com') && !postUrl.includes('x.com')) {
        return res.status(400).json({ error: 'URL inválida. Use um link do Twitter/X' });
    }

    try {
        // Verificar créditos
        const { data: user } = await supabase
            .from('users')
            .select('credits')
            .eq('id', req.user.id)
            .single();

        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        if (user.credits < commentsCount) {
            return res.status(402).json({
                error: `Créditos insuficientes. Você tem ${user.credits}, precisa de ${commentsCount}.`
            });
        }

        // Criar campanha
        const newCampaign = {
            userId: req.user.id,
            postUrl,
            totalComments: commentsCount,
            completedComments: 0,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const { data: campaign, error } = await supabase
            .from('campaigns')
            .insert(newCampaign)
            .select()
            .single();

        if (error) throw error;

        // Debitar créditos (Atomic transaction ideally, separate here for simplicity)
        await supabase
            .from('users')
            .update({ credits: user.credits - commentsCount })
            .eq('id', req.user.id);

        console.log(`📋 Nova campanha: ${campaign.id} - ${commentsCount} comentários em ${postUrl}`);

        if (addCampaignJob) {
            await addCampaignJob(campaign);
            await supabase.from('campaigns').update({ status: 'queued' }).eq('id', campaign.id);
        } else {
            // Fallback: simulate
            processCampaign(campaign.id);
        }

        res.json({
            message: 'Campanha criada com sucesso!',
            campaign,
            creditsRemaining: user.credits - commentsCount
        });
    } catch (err) {
        console.error('Campaign Error:', err);
        res.status(500).json({ error: 'Erro ao criar campanha' });
    }
});

// Listar campanhas
app.get('/api/campaigns', authMiddleware, async (req, res) => {
    try {
        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('userId', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao listar campanhas' });
    }
});

// Detalhes
app.get('/api/campaigns/:id', authMiddleware, async (req, res) => {
    try {
        const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', req.params.id)
            .eq('userId', req.user.id)
            .single();

        if (error || !campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

        res.json(campaign);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar campanha' });
    }
});

// ================== SIMULAÇÃO DO BOT ==================
async function processCampaign(campaignId) {
    // Atualizar status para running
    await supabase.from('campaigns').update({ status: 'running' }).eq('id', campaignId);

    // Buscar dados atuais
    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
    if (!campaign) return;

    const total = campaign.totalComments;

    for (let i = 0; i < total; i++) {
        await new Promise(r => setTimeout(r, 3000)); // 3s delay

        // Atualizar progresso
        await supabase.from('campaigns').update({
            completedComments: i + 1,
            status: (i + 1 === total) ? 'completed' : 'running'
        }).eq('id', campaignId);
    }

    console.log(`✅ Campanha ${campaignId} concluída (Simulada)!`);
}

// For Vercel Serverless - export the app
export default app;

// Local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

