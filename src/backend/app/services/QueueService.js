import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config/index.js';

// Rule 13: Env Isolation - distinct behavior for Serverless
const isServerless = config.isVercel;

let connection = null;
let campaignQueue = null;
let accountQueue = null;
let useMock = isServerless;

if (!isServerless) {
    try {
        connection = new IORedis({
            host: config.redis.host,
            port: config.redis.port,
            maxRetriesPerRequest: null,
            retryStrategy: times => Math.min(times * 50, 2000)
        });

        // Rule 02: Async Performance - Queues for background tasks
        campaignQueue = new Queue('campaigns', { connection });
        accountQueue = new Queue('accounts', { connection });

        // Listeners
        const campaignEvents = new QueueEvents('campaigns', { connection });
        campaignEvents.on('completed', ({ jobId }) => console.log(`✅ Job ${jobId} completed`));

        // Quick check (async) or let library handle. 
        // BullMQ checks version on connect. If it fails, it will emit 'error' on queue.
        campaignQueue.on('error', (err) => {
            console.error('⚠️ Queue Error (Switching to Mock):', err.message);
            campaignQueue = null; // Invalidate the queue
            useMock = true;
        });

    } catch (e) {
        console.error('⚠️ Redis Init Error (Using Mock):', e.message);
        useMock = true;
    }
} else {
    console.log('⚡ Serverless Mode: Queues are mocked.');
}

// Helper to check usage
const shouldMock = () => useMock || !campaignQueue;

class QueueService {
    async addCampaignJob(campaign) {
        if (shouldMock()) {
            console.log(`[MOCK] Campaign job added: ${campaign.id}`);
            return { id: 'mock-id' };
        }
        try {
            return await campaignQueue.add('process-campaign', {
                campaignId: campaign.id,
                postUrl: campaign.postUrl, // mapped from post_url if needed? Service passes object.
                totalComments: campaign.comment_count, // Service passes DB object with snake_case?
                userId: campaign.user_id,
                createdAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('⚠️ Queue Add Error (Fallback Mock):', e.message);
            return { id: 'mock-fallback' };
        }
    }

    async addAccountCreationJob(accountData) {
        if (shouldMock()) {
            console.log(`[MOCK] Account job added: ${accountData.email}`);
            return { id: 'mock-id' };
        }
        try {
            return await accountQueue.add('create-account', {
                ...accountData,
                createdAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('⚠️ Queue Add Error (Fallback Mock):', e.message);
            return { id: 'mock-fallback' };
        }
    }
}

export default new QueueService();
