-- Migration: Admin Panel Tables

-- 1. Proxies Table
CREATE TABLE IF NOT EXISTS proxies (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    protocol VARCHAR(50) DEFAULT 'http', -- http, socks4, socks5
    status VARCHAR(50) DEFAULT 'active', -- active, dead, slow
    country VARCHAR(10),
    last_checked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bot Accounts Table (Twitter/X)
CREATE TABLE IF NOT EXISTS bot_accounts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE, -- @handle
    password VARCHAR(255),
    email VARCHAR(255),
    email_password VARCHAR(255),
    auth_token VARCHAR(255), -- ct0 or auth_token
    cookies JSONB, -- Full cookie jar from puppeteer/playwright
    proxy_id INTEGER REFERENCES proxies(id),
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, locked, banned
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Admin Users Table (Access Control)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- admin, superadmin, support
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info', -- info, warn, error
    service VARCHAR(50), -- bot, api, admin_panel, sync
    message TEXT,
    metadata JSONB, -- Extra details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_bot_accounts_status ON bot_accounts(status);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
