// Rule 08: Error Handling with Context
import { v4 as uuidv4 } from 'uuid';

export function errorHandler(err, req, res, next) {
    const correlationId = req.headers['x-request-id'] || uuidv4();
    const timestamp = new Date().toISOString();

    // Log Technical Details (Rule 08)
    console.error(JSON.stringify({
        level: 'ERROR',
        timestamp,
        correlationId,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        user: req.user?.id || 'anonymous'
    }));

    // User-Friendly Response (Rule 08)
    const statusCode = err.status || 500;
    const message = statusCode === 500 ? 'Erro interno no servidor' : err.message;

    res.status(statusCode).json({
        error: {
            message,
            code: err.code || 'INTERNAL_ERROR',
            requestId: correlationId
        }
    });
}
