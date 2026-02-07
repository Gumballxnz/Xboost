
require('dotenv').config({ path: '../../.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Configs
require('./api/middlewares/auth'); // Passport JWT Config
require('./api/middlewares/passport-strategies'); // OAuth Strategies
require('./queues/process-campaign.job'); // Inicia Worker

const app = express();

// 🛡️ Segurança
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// 🚦 Rate Limiting (Simples em memória para MVP)
const rateLimiter = new RateLimiterMemory({
    points: 10, // 10 requests
    duration: 1, // per 1 second
});

const rateLimiterMiddleware = (req, res, next) => {
    rateLimiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            res.status(429).json({ message: 'Too Many Requests' });
        });
};

app.use(rateLimiterMiddleware);

// 🛣️ Rotas Básicas
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// 🔐 Auth Routes
const authRoutes = require('./api/routes/auth');
app.use('/api/auth', authRoutes);

// 🚀 Campaign Routes
const campaignRoutes = require('./api/routes/campaigns');
app.use('/api/v1/campaigns', campaignRoutes);

// Exemplo de rota protegida
app.get('/api/v1/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
    res.json({ message: 'Você tem acesso!', user: req.user });
});

// Importar rotas (boilerplate)
// const campaignRoutes = require('./api/routes/campaigns');
// app.use('/api/v1/campaigns', campaignRoutes);

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 XBoost SaaS API running on port ${PORT}`);
});
