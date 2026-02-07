// =====================================================
// WORKER.JS - Bot Worker for XBoost SaaS
// Consumes campaign jobs from Redis queue
// =====================================================

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Import rotator dependencies
import { launchStealthBrowser, humanDelay, humanType } from './workers/humanize_browser.js';
import proxyManager from './workers/proxy_manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database paths
const ACCOUNTS_DB = path.join(__dirname, '../../config/twitter-accounts.json');
const CAMPAIGNS_DB = path.join(__dirname, '../saas/frontend/data/campaigns.json');

// Redis connection
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
});

// Spintax comments
const SPINTAX_COMMENTS = [
    '{Incrível|Muito bom|Top|Show|Excelente}! {Conteúdo|Post} {top demais|de qualidade}. {👏|🔥|💯}',
    '{Adorei|Curti muito|Sensacional}! {Continue assim|Parabéns}. {✅|👍|🙌}',
    '{Wow|Uau}! {Isso é incrível|Que demais}. {😍|🤩|⭐}',
    '{Ótimo|Perfeito|Fantástico} {conteúdo|post}! {👏👏|🔥🔥}',
    '{Muito bom|Excelente}! {Valeu por compartilhar}. {🙏|✨}'
];

function expandSpintax(template) {
    return template.replace(/\{([^{}]+)\}/g, (match, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

function getRandomComment() {
    const template = SPINTAX_COMMENTS[Math.floor(Math.random() * SPINTAX_COMMENTS.length)];
    return expandSpintax(template);
}

// Update campaign status in database
function updateCampaignStatus(campaignId, updates) {
    try {
        if (!fs.existsSync(CAMPAIGNS_DB)) return;
        const campaigns = fs.readJsonSync(CAMPAIGNS_DB);
        const idx = campaigns.findIndex(c => c.id === campaignId);
        if (idx !== -1) {
            Object.assign(campaigns[idx], updates);
            fs.writeJsonSync(CAMPAIGNS_DB, campaigns, { spaces: 2 });
        }
    } catch (e) {
        console.error('Error updating campaign:', e.message);
    }
}

// Login to Twitter
async function login(page, account) {
    console.log(`🔑 Logging in: ${account.username || account.email}...`);

    try {
        await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2', timeout: 60000 });
        await humanDelay(3000);

        // Username
        const inputUser = await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
        if (inputUser) {
            await humanType(page, 'input[autocomplete="username"]', account.username || account.email);
            await humanDelay(500);
            await page.keyboard.press('Enter');
        }
        await humanDelay(2000);

        // Password
        const inputPass = await page.waitForSelector('input[name="password"]', { timeout: 10000 });
        await humanType(page, 'input[name="password"]', account.password);
        await humanDelay(500);
        await page.keyboard.press('Enter');
        await humanDelay(5000);

        // Check success
        const loggedIn = await page.$('div[aria-label="Account menu"]');
        if (loggedIn) {
            console.log('   ✅ Login SUCCESS!');
            return true;
        }

        return false;
    } catch (e) {
        console.log(`   ❌ Login Error: ${e.message}`);
        return false;
    }
}

// Post a comment on Twitter
async function commentOnPost(page, postUrl, message) {
    console.log(`💬 Navigating to post...`);
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await humanDelay(5000);

    await page.evaluate(() => window.scrollBy(0, 300));
    await humanDelay(1000);

    try {
        const replyBox = await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { timeout: 10000 });
        await replyBox.click();
        await humanDelay(500);

        console.log(`   ✍️ Typing: "${message}"`);
        for (const char of message) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 80 });
        }
        await humanDelay(1000);

        const replyBtn = await page.waitForSelector('div[data-testid="tweetButtonInline"], div[data-testid="tweetButton"]', { timeout: 5000 });
        await replyBtn.click();
        await humanDelay(3000);

        console.log('   ✅ Comment posted!');
        return true;
    } catch (e) {
        console.log(`   ❌ Comment Error: ${e.message}`);
        return false;
    }
}

// ================== CAMPAIGN WORKER ==================

const campaignWorker = new Worker('campaigns', async (job) => {
    const { campaignId, postUrl, totalComments, userId } = job.data;

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🚀 Processing Campaign: ${campaignId}`);
    console.log(`   URL: ${postUrl}`);
    console.log(`   Comments: ${totalComments}`);
    console.log(`${'═'.repeat(50)}\n`);

    // Update status to running
    updateCampaignStatus(campaignId, { status: 'running' });

    // Load accounts
    if (!fs.existsSync(ACCOUNTS_DB)) {
        throw new Error('Accounts database not found');
    }

    const accounts = fs.readJsonSync(ACCOUNTS_DB);
    const activeAccounts = accounts.filter(a => a.status === 'ACTIVE');

    if (activeAccounts.length === 0) {
        throw new Error('No active accounts available');
    }

    let successCount = 0;
    let failCount = 0;
    const maxComments = Math.min(totalComments, activeAccounts.length);

    for (let i = 0; i < maxComments; i++) {
        const account = activeAccounts[i % activeAccounts.length];

        console.log(`\n👤 [${i + 1}/${maxComments}] ${account.username || account.email}`);

        // Get proxy
        let proxy = null;
        if (account.proxy && account.proxy !== 'localhost') {
            proxy = proxyManager.parseProxy(account.proxy);
        }

        if (!proxy) {
            console.log('   ⚠️ No proxy, skipping for safety');
            failCount++;
            continue;
        }

        let browser, page;
        try {
            const result = await launchStealthBrowser({
                proxy: {
                    server: proxy.server,
                    username: proxy.username,
                    password: proxy.password
                },
                accountId: account.email,
                headless: true // Run headless in worker mode
            });
            browser = result.browser;
            page = result.page;
        } catch (error) {
            console.log(`   ❌ Browser Error: ${error.message}`);
            failCount++;
            continue;
        }

        try {
            const loginSuccess = await login(page, account);

            if (!loginSuccess) {
                console.log('   ⚠️ Login failed');
                await browser.close();
                failCount++;
                continue;
            }

            const message = getRandomComment();
            const commentSuccess = await commentOnPost(page, postUrl, message);

            if (commentSuccess) {
                successCount++;

                // Report progress
                await job.updateProgress({
                    completed: successCount,
                    failed: failCount,
                    total: maxComments
                });

                // Update campaign progress
                updateCampaignStatus(campaignId, {
                    completedComments: successCount,
                    status: successCount >= maxComments ? 'completed' : 'running'
                });
            } else {
                failCount++;
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
            failCount++;
        }

        await browser.close();

        // Delay between accounts
        const delay = 5000 + Math.random() * 10000;
        console.log(`   ⏳ Waiting ${Math.round(delay / 1000)}s...`);
        await humanDelay(delay);
    }

    // Final update
    updateCampaignStatus(campaignId, {
        status: 'completed',
        completedComments: successCount,
        completedAt: new Date().toISOString()
    });

    console.log(`\n${'═'.repeat(50)}`);
    console.log('🏁 CAMPAIGN COMPLETED');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`${'═'.repeat(50)}\n`);

    return { success: successCount, failed: failCount };

}, { connection, concurrency: 1 });

// Worker events
campaignWorker.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completed:`, result);
});

campaignWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed:`, err.message);
    if (job) {
        updateCampaignStatus(job.data.campaignId, { status: 'failed' });
    }
});

campaignWorker.on('error', (err) => {
    console.error('Worker error:', err);
});

console.log('');
console.log('🤖 ════════════════════════════════════════');
console.log('   XBOOST BOT WORKER - Ready');
console.log('════════════════════════════════════════════');
console.log('   Waiting for campaign jobs...');
console.log('════════════════════════════════════════════');
console.log('');
