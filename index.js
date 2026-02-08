// XBoost Entry Point (Vercel Support)
import express from 'express';
import app from './src/saas/frontend/server.js';

// Vercel Serverless requires default export
export default app;

// Local dev support
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
