import app from './app/app.js';
import config from './app/config/index.js';

const PORT = config.port || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${config.env.toUpperCase()}]`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`API Docs: http://localhost:${PORT}/api-docs (TODO)`);
});
