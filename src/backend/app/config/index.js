// Rule 13: Env Isolation & Rule 04: Secrets Vault
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env based on NODE_ENV (Rule 13)
// We look for .env.local first, then .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const requiredEnv = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'JWT_SECRET'
];

// Validate required envs (Rule 04)
for (const env of requiredEnv) {
    if (!process.env[env] && !process.env[`NEXT_PUBLIC_${env}`]) {
        console.warn(`⚠️ Warning: Missing environment variable: ${env}`);
    }
}

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3003,
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-unsafe',
    supabase: {
        url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    },
    oauth: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        }
    },
    isVercel: !!(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV)
};

export default config;
