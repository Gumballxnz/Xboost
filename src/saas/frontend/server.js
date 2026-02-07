// =====================================================
// XBOOST SAAS - API Server with OAuth
// =====================================================
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';

// Queue (BullMQ) - Import conditionally to allow running without Redis
let addCampaignJob = null;
let getQueueStats = null;
try {
    const queue = await import('./queue.js');
    addCampaignJob = queue.addCampaignJob;
    getQueueStats = queue.getQueueStats;
    console.log('✅ Redis queue connected');
} catch (e) {
    console.log('⚠️ Redis not available, using simulation mode');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = 'xboost-secret-change-in-production';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ================== OAuth Config ==================
// Para produção, configure estas variáveis de ambiente:
const OAUTH_CONFIG = {
    github: {
        clientID: process.env.GITHUB_CLIENT_ID || 'GITHUB_CLIENT_ID',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || 'GITHUB_CLIENT_SECRET',
        callbackURL: `${BASE_URL}/api/auth/github/callback`
    },
    google: {
        clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
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
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Database simulado (JSON files)
const DB_PATH = path.join(__dirname, 'data');
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH);

const usersFile = path.join(DB_PATH, 'users.json');
const campaignsFile = path.join(DB_PATH, 'campaigns.json');

function loadDB(file) {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function saveDB(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================== Passport Serialization ==================
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const users = loadDB(usersFile);
    const user = users.find(u => u.id === id);
    done(null, user);
});

// ================== GitHub Strategy ==================
passport.use(new GitHubStrategy(
    OAUTH_CONFIG.github,
    async (accessToken, refreshToken, profile, done) => {
        try {
            const users = loadDB(usersFile);
            let user = users.find(u => u.githubId === profile.id);

            if (!user) {
                // Criar novo usuário
                user = {
                    id: Date.now().toString(),
                    email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
                    name: profile.displayName || profile.username,
                    avatar: profile.photos?.[0]?.value,
                    githubId: profile.id,
                    provider: 'github',
                    credits: 5,
                    plan: 'free',
                    createdAt: new Date().toISOString()
                };
                users.push(user);
                saveDB(usersFile, users);
                console.log(`🆕 Novo usuário via GitHub: ${user.name}`);
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

// ================== Google Strategy ==================
passport.use(new GoogleStrategy(
    OAUTH_CONFIG.google,
    async (accessToken, refreshToken, profile, done) => {
        try {
            const users = loadDB(usersFile);
            let user = users.find(u => u.googleId === profile.id);

            if (!user) {
                // Criar novo usuário
                user = {
                    id: Date.now().toString(),
                    email: profile.emails?.[0]?.value || `${profile.id}@google.local`,
                    name: profile.displayName,
                    avatar: profile.photos?.[0]?.value,
                    googleId: profile.id,
                    provider: 'google',
                    credits: 5,
                    plan: 'free',
                    createdAt: new Date().toISOString()
                };
                users.push(user);
                saveDB(usersFile, users);
                console.log(`🆕 Novo usuário via Google: ${user.name}`);
            }
            return done(null, user);
        } catch (err) {
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

    const users = loadDB(usersFile);

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: Date.now().toString(),
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        credits: 5, // 5 créditos grátis!
        plan: 'free',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveDB(usersFile, users);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
        message: 'Conta criada! Você ganhou 5 créditos grátis 🎉',
        token,
        user: { id: newUser.id, email: newUser.email, name: newUser.name, credits: newUser.credits }
    });
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    const users = loadDB(usersFile);
    const user = users.find(u => u.email === email);

    if (!user) {
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
});

// Me (dados do usuário logado)
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const users = loadDB(usersFile);
    const user = users.find(u => u.id === req.user.id);

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        plan: user.plan,
        avatar: user.avatar,
        provider: user.provider
    });
});

// ================== OAuth Routes ==================

// GitHub OAuth
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/api/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/?error=github_failed' }),
    (req, res) => {
        // Gerar JWT e redirecionar
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        // Redirecionar com token na URL (frontend vai capturar)
        res.redirect(`/?token=${token}&provider=github`);
    }
);

// Google OAuth
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?error=google_failed' }),
    (req, res) => {
        // Gerar JWT e redirecionar
        const token = jwt.sign(
            { id: req.user.id, email: req.user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        // Redirecionar com token na URL (frontend vai capturar)
        res.redirect(`/?token=${token}&provider=google`);
    }
);

// ================== CAMPAIGN ROUTES ==================

// Criar campanha
app.post('/api/campaigns', authMiddleware, async (req, res) => {
    const { postUrl, commentsCount } = req.body;

    if (!postUrl || !commentsCount) {
        return res.status(400).json({ error: 'URL do post e quantidade são obrigatórios' });
    }

    // Verificar se é URL válida do Twitter/X
    if (!postUrl.includes('twitter.com') && !postUrl.includes('x.com')) {
        return res.status(400).json({ error: 'URL inválida. Use um link do Twitter/X' });
    }

    // Verificar créditos
    const users = loadDB(usersFile);
    const userIdx = users.findIndex(u => u.id === req.user.id);

    if (userIdx === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (users[userIdx].credits < commentsCount) {
        return res.status(402).json({
            error: `Créditos insuficientes. Você tem ${users[userIdx].credits}, precisa de ${commentsCount}.`
        });
    }

    // Debitar créditos
    users[userIdx].credits -= commentsCount;
    saveDB(usersFile, users);

    // Criar campanha
    const campaigns = loadDB(campaignsFile);
    const campaign = {
        id: Date.now().toString(),
        userId: req.user.id,
        postUrl,
        totalComments: commentsCount,
        completedComments: 0,
        status: 'pending', // pending, running, completed, failed
        createdAt: new Date().toISOString()
    };

    campaigns.push(campaign);
    saveDB(campaignsFile, campaigns);

    // Add to queue (real processing) or simulate
    console.log(`📋 Nova campanha: ${campaign.id} - ${commentsCount} comentários em ${postUrl}`);

    if (addCampaignJob) {
        // Real queue processing
        await addCampaignJob(campaign);
        campaign.status = 'queued';
    } else {
        // Fallback: simulate processing
        processCampaign(campaign.id);
    }

    res.json({
        message: 'Campanha criada com sucesso!',
        campaign,
        creditsRemaining: users[userIdx].credits
    });
});

// Listar campanhas do usuário
app.get('/api/campaigns', authMiddleware, (req, res) => {
    const campaigns = loadDB(campaignsFile);
    const userCampaigns = campaigns
        .filter(c => c.userId === req.user.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(userCampaigns);
});

// Detalhes de uma campanha
app.get('/api/campaigns/:id', authMiddleware, (req, res) => {
    const campaigns = loadDB(campaignsFile);
    const campaign = campaigns.find(c => c.id === req.params.id && c.userId === req.user.id);

    if (!campaign) {
        return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    res.json(campaign);
});

// ================== SIMULAÇÃO DO BOT ==================
async function processCampaign(campaignId) {
    const campaigns = loadDB(campaignsFile);
    const idx = campaigns.findIndex(c => c.id === campaignId);

    if (idx === -1) return;

    campaigns[idx].status = 'running';
    saveDB(campaignsFile, campaigns);

    // Simular processamento gradual
    const total = campaigns[idx].totalComments;

    for (let i = 0; i < total; i++) {
        await new Promise(r => setTimeout(r, 3000)); // 3s por comentário (simulado)

        const updated = loadDB(campaignsFile);
        const current = updated.findIndex(c => c.id === campaignId);
        if (current !== -1) {
            updated[current].completedComments = i + 1;
            if (i + 1 === total) {
                updated[current].status = 'completed';
            }
            saveDB(campaignsFile, updated);
        }
    }

    console.log(`✅ Campanha ${campaignId} concluída!`);
}

// ================== ADMIN ROUTES ==================
app.get('/api/admin/stats', (req, res) => {
    const users = loadDB(usersFile);
    const campaigns = loadDB(campaignsFile);

    res.json({
        totalUsers: users.length,
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'running').length,
        completedCampaigns: campaigns.filter(c => c.status === 'completed').length,
        totalComments: campaigns.reduce((sum, c) => sum + c.completedComments, 0)
    });
});

// ================== START SERVER ==================
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ════════════════════════════════════════');
    console.log('   XBOOST SaaS - Twitter Bot Platform');
    console.log('════════════════════════════════════════════');
    console.log(`   🌐 http://localhost:${PORT}`);
    console.log('════════════════════════════════════════════');
    console.log('');
});
