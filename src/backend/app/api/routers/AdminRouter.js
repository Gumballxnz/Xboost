import express from 'express';
import AdminService from '../../services/AdminService.js';
import { authenticate } from '../middlewares/AuthMiddleware.js';

const router = express.Router();

// Middleware: Check Admin Role
async function requireAdmin(req, res, next) {
    if (!req.user || !req.user.email) return res.status(401).json({ error: 'Unauthorized' });

    const isAdmin = await AdminService.isAdmin(req.user.email);
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
    next();
}

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { limit, offset } = req.query;
        const result = await AdminService.listUsers(Number(limit) || 10, Number(offset) || 0);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// GET /api/admin/stats
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const stats = await AdminService.getStats();
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

export default router;
