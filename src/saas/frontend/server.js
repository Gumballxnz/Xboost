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

// Queue (BullMQ) - Import conditionally
let addCampaignJob = null;
try {
    const queue = await import('./queue.js');
    addCampaignJob = queue.addCampaignJob;
    console.log('✅ Redis queue connected');
} catch (e) {
    console.log('⚠️ Redis not available, using simulation mode');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'xboost-secret-change-in-production';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
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
            // Check if user exists
            let { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('githubId', profile.id)
                .single();

            if (!user) {
                // Create new user
                const newUser = {
                    email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
                    name: profile.displayName || profile.username,
                    avatar: profile.photos?.[0]?.value,
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

                if (error) throw error;
                user = data;
                console.log(`🆕 Novo usuário via GitHub: ${user.name}`);
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
            let { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('googleId', profile.id)
                .single();

            if (!user) {
                const newUser = {
                    email: profile.emails?.[0]?.value || `${profile.id}@google.local`,
                    name: profile.displayName,
                    avatar: profile.photos?.[0]?.value,
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

                if (error) throw error;
                user = data;
                console.log(`🆕 Novo usuário via Google: ${user.name}`);
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

// ================== AUTH ROUTES ==================

// Registro
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha obrigatórios' });
    }

    try {
        // Check existing
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            credits: 5,
            plan: 'free',
            provider: 'email',
            created_at: new Date().toISOString()
        };

        const { data: user, error } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (error) throw error;

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Conta criada! Você ganhou 5 créditos grátis 🎉',
            token,
            user: { id: user.id, email: user.email, name: user.name, credits: user.credits }
        });
    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, credits: user.credits }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Erro ao fazer login' });
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
