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

// Admin Routes - Static Imports to ensure Vercel bundles them
import proxiesRouter from './admin/routes/proxies.js';
import accountsRouter from './admin/routes/accounts.js';
import usersRouter from './admin/routes/users.js';
import statsRouter from './admin/routes/stats.js';

console.log('✅ Admin routes loaded');

// ================== Supabase Config ==================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL/Key missing. Check environment variables.');
}

// FAIL-SAFE: Create client only if keys exist, otherwise mock to prevent crash on boot
const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : {
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => ({ error: { message: 'SETUP REQUIRED: Add Supabase Keys to Vercel Environment Variables.' } }),
                    order: () => ({ error: { message: 'SETUP REQUIRED: Add Supabase Keys to Vercel Environment Variables.' } })
                }),
                insert: () => ({ select: () => ({ single: () => ({ error: { message: 'SETUP REQUIRED: Add Supabase Keys to Vercel Environment Variables.' } }) }) }),
                update: () => ({ eq: () => ({ select: () => ({ single: () => ({ error: { message: 'SETUP REQUIRED: Add Supabase Keys to Vercel Environment Variables.' } }) }) }) }),
            })
        })
    };

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

// ================== OAuth Strategies ==================
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy(
        OAUTH_CONFIG.github,
        async (accessToken, refreshToken, profile, done) => {
            try {
                // ... (Existing GitHub Logic) ...
                console.log('GitHub Profile:', JSON.stringify(profile));
                let { data: user } = await supabase.from('users').select('*').eq('githubId', profile.id).single();
                if (!user) {
                    const email = profile.emails?.[0]?.value || profile._json?.email || `${profile.username}@github.local`;
                    const avatar = profile.photos?.[0]?.value || profile._json?.avatar_url;
                    const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).single();
                    if (existingUser) {
                        const { data: updated, error } = await supabase.from('users').update({ githubId: profile.id, avatar_url: existingUser.avatar_url || avatar }).eq('id', existingUser.id).select().single();
                        if (error) throw error;
                        user = updated;
                    } else {
                        const newUser = { email, name: profile.displayName || profile.username, avatar_url: avatar, githubId: profile.id, provider: 'github', credits: 5, plan: 'free', created_at: new Date().toISOString() };
                        const { data, error } = await supabase.from('users').insert(newUser).select().single();
                        if (error) throw error;
                        user = data;
                    }
                }
                return done(null, user);
            } catch (err) {
                console.error('GitHub Auth Error:', err);
                return done(err, null);
            }
        }
    ));
    console.log('✅ GitHub Auth Enabled');
} else {
    console.warn('⚠️ GitHub Client ID/Secret missing. Skipping Strategy.');
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
        OAUTH_CONFIG.google,
        async (accessToken, refreshToken, profile, done) => {
            try {
                // ... (Existing Google Logic) ...
                let { data: user } = await supabase.from('users').select('*').eq('googleId', profile.id).single();
                if (!user) {
                    const email = profile.emails?.[0]?.value || `${profile.id}@google.local`;
                    const avatar = profile.photos?.[0]?.value;
                    const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).single();
                    if (existingUser) {
                        const { data: updated, error } = await supabase.from('users').update({ googleId: profile.id, avatar_url: existingUser.avatar_url || avatar }).eq('id', existingUser.id).select().single();
                        if (error) throw error;
                        user = updated;
                    } else {
                        const newUser = { email, name: profile.displayName || profile.name?.givenName, avatar_url: avatar, googleId: profile.id, provider: 'google', credits: 5, plan: 'free', created_at: new Date().toISOString() };
                        const { data, error } = await supabase.from('users').insert(newUser).select().single();
                        if (error) throw error;
                        user = data;
                    }
                }
                return done(null, user);
            } catch (err) {
                console.error('Google Auth Error:', err);
                return done(err, null);
            }
        }
    ));
    console.log('✅ Google Auth Enabled');
} else {
    console.warn('⚠️ Google Client ID/Secret missing. Skipping Strategy.');
}
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

// ================== LOJOU WEBHOOK ==================
app.post('/api/webhooks/lojou', async (req, res) => {
    console.log('🔔 [LOJOU] Webhook Received:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Body:', JSON.stringify(req.body));

    try {
        const payload = req.body;

        // 1. Identify User (by email) -> Lojou usually sends 'customer_email' or 'email'
        // We'll log everything for now to reverse-engineer the schema
        const email = payload.email || payload.customer_email || payload.client_email;

        if (!email) {
            console.warn('⚠️ [LOJOU] No email found in payload');
            return res.status(200).json({ received: true, status: 'no_email_identified' });
        }

        console.log(`👤 Processing payment for: ${email}`);

        // 2. Find User
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user) {
            console.log('🆕 New User! Auto-creating account...');
            // TODO: Auto-Signup Logic (Generate Password, Create User, Email Credentials)
            // For now, just logging
        } else {
            console.log(`✅ Existing User Found: ${user.id} (${user.credits} credits)`);
            // TODO: Update Plan / Add Credits logic
            // await supabase.from('users').update({ credits: user.credits + 100, plan: 'pro' }).eq('id', user.id);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('❌ [LOJOU] Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// ================== GLOBAL ERROR HANDLER ==================
app.use((err, req, res, next) => {
    console.error('🔥 Unhandled Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        code: 500
    });
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

