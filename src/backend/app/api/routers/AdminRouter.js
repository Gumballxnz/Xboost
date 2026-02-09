import AdminAuthService from '../../services/AdminAuthService.js';
import ResourceService from '../../services/ResourceService.js';
import BotIntegrationService from '../../services/BotIntegrationService.js';
import { authenticate } from '../middlewares/AuthMiddleware.js';

const router = express.Router();

// --- Public Auth Routes (OTP Flow) ---

// POST /api/admin/auth/login-otp
router.post('/auth/login-otp', async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await AdminAuthService.requestLogin(email);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// POST /api/admin/auth/verify
router.post('/auth/verify', async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const result = await AdminAuthService.verifyLogin(email, otp);
        res.json(result);
    } catch (err) {
        // Return 401 for bad login attempts
        res.status(401).json({ error: err.message });
    }
});

// --- Protected Routes ---

// Middleware: Check Admin Role
async function requireAdmin(req, res, next) {
    if (!req.user || !req.user.email) return res.status(401).json({ error: 'Unauthorized' });

    // In V2, we might want to check DB for specific roles, but email check is fine for now
    // Or check the JWT payload 'role' === 'admin'
    if (req.user.role !== 'admin') {
        const isAdmin = await AdminService.isAdmin(req.user.email);
        if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
    }
    next();
}

// --- Dashboard Stats ---
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const stats = await AdminService.getStats();
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

// --- Invites ---
router.post('/invite', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await AdminAuthService.createInvite(req.user.id, email);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.get('/invites', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const result = await AdminAuthService.listInvites();
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// --- Proxies ---
router.get('/proxies', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { limit, offset } = req.query;
        const result = await ResourceService.listProxies(Number(limit), Number(offset));
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.post('/proxies', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const result = await ResourceService.addProxy(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/proxies/:id', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const result = await ResourceService.deleteProxy(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// --- Bot Accounts ---
router.get('/accounts', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { limit, offset } = req.query;
        const result = await ResourceService.listAccounts(Number(limit), Number(offset));
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.post('/accounts', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const result = await ResourceService.addAccount(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.delete('/accounts/:id', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const result = await ResourceService.deleteAccount(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// --- Bot Actions ---
router.post('/generate-accounts', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { count } = req.body;
        const result = await BotIntegrationService.generateAccounts(Number(count) || 10);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

export default router;
