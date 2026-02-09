import jwt from 'jsonwebtoken';
import config from '../../config/index.js';

// Rule 01: Security Isolation
export function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    // Also check query param if needed, or cookie? Rule 05 prefers cookies.
    // For now, sticking to header to avoid breaking mobile/cli clients.

    if (!token) {
        // Fail Fast (Rule 08)
        return res.status(401).json({ error: 'Token necessário' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded; // Attach user identity
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}
