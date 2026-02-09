// Rule 11: API Consistency - Standardize Routes
import express from 'express';
import AuthService from '../../services/AuthService.js';
import { z } from 'zod';

const router = express.Router();

// Rule 08: Error Handling - Fail Fast with Zod
const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional()
});

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const validated = RegisterSchema.parse(req.body);
        const result = await AuthService.register(validated);
        res.status(201).json(result);
    } catch (err) {
        next(err); // Rule 08: No Swallow
    }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const validated = LoginSchema.parse(req.body);
        const result = await AuthService.login(validated.email, validated.password);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

import passport from '../../config/passport.js';

// ... (previous imports)

// OAuth: GitHub
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/auth.html?error=github_failed', session: false }),
    (req, res) => {
        // Generate Token
        const result = AuthService.generateToken(req.user);
        // Redirect to frontend with token
        res.redirect(`/?token=${result.token}`);
    }
);

// OAuth: Google
// router.get('/google', ...);

export default router;
