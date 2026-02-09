// Rule 06: Clean Architecture - Main App Assembly
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit'; // Rule 01 (Security)

import config from './config/index.js';
import { errorHandler } from './api/middlewares/ErrorHandler.js';
import AuthRouter from './api/routers/AuthRouter.js';
import CampaignRouter from './api/routers/CampaignRouter.js';
import AdminRouter from './api/routers/AdminRouter.js';
import PaymentRouter from './api/routers/PaymentRouter.js';

import passport from './config/passport.js';

const app = express();

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Health Check (Rule 08: Observability)
app.get('/health', (req, res) => res.json({ status: 'ok', env: config.env }));

// Security Middlewares (Rule 01)
app.use(helmet({ contentSecurityPolicy: false })); // Allow inline scripts for now
app.use(cors({ origin: true, credentials: true })); // Configure origin strictly in prod
app.use(express.json());
app.use(passport.initialize());

// Static Files (Legacy Frontend Support)
import fs from 'fs';
// Use process.cwd() to be relative to project root (where we run node)
const staticPath = path.join(process.cwd(), 'src/saas/frontend/public');
console.log('📂 Serving static files from:', staticPath);
if (!fs.existsSync(staticPath)) console.error('❌ STATIC PATH DOES NOT EXIST!');
else console.log('✅ Static path verified.');

app.use(express.static(staticPath));
app.use('/admin', express.static(path.join(staticPath, 'admin')));

// Rate Limiting (Rule 01)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', limiter);

// Routes (Rule 11 - Consistent API)
app.use('/api/auth', AuthRouter);
app.use('/api/campaigns', CampaignRouter);
app.use('/api/admin', AdminRouter);
app.use('/api/payments', PaymentRouter); // Webhooks

// Health Check


// Webhook (Lojou)
// Ideally move to PaymentRouter.js, but for now strict copy from legacy to not lose logic
// ... Pending migration of Payment Logic ...

// Global Error Handler (Rule 08)
app.use(errorHandler);

export default app;
