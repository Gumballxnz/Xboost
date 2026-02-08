// =====================================================
// QUEUE.JS - BullMQ Configuration for XBoost SaaS
// =====================================================
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection (use environment variables in production)
const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
};

// Vercel Serverless Optimization:
const isVercel = process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV;

let connection = null;
let campaignQueue, accountQueue, campaignEvents;

// Function placeholders
let addCampaignJob, addAccountCreationJob, getQueueStats;

if (isVercel) {
    console.log('⚡ Vercel Environment: Skipping Redis Queue initialization.');

    // Mocks
    connection = null;
    campaignQueue = {
        add: async () => ({ id: 'mock-job-id' }),
        getWaitingCount: async () => 0,
        getActiveCount: async () => 0,
        getCompletedCount: async () => 0,
        getFailedCount: async () => 0
    };
    accountQueue = { add: async () => ({ id: 'mock-job-id' }) };
    campaignEvents = { on: () => { } };

    addCampaignJob = async (campaign) => {
        console.log(`[MOCK] Campaign job added: ${campaign.id}`);
        return { id: 'mock-id' };
    };

    addAccountCreationJob = async (accountData) => {
        console.log(`[MOCK] Account job added: ${accountData.email}`);
        return { id: 'mock-id' };
    };

    getQueueStats = async () => {
        return {
            campaigns: { waiting: 0, active: 0, completed: 0, failed: 0 }
        };
    };

} else {
    // Real Redis Connection
    connection = new IORedis(REDIS_CONFIG);

    campaignQueue = new Queue('campaigns', { connection });
    accountQueue = new Queue('accounts', { connection });
    campaignEvents = new QueueEvents('campaigns', { connection });

    // Listen to campaign events
    campaignEvents.on('completed', ({ jobId, returnvalue }) => {
        console.log(`✅ Campaign job ${jobId} completed:`, returnvalue);
    });

    campaignEvents.on('failed', ({ jobId, failedReason }) => {
        console.log(`❌ Campaign job ${jobId} failed:`, failedReason);
    });

    campaignEvents.on('progress', ({ jobId, data }) => {
        console.log(`📊 Campaign job ${jobId} progress:`, data);
    });

    addCampaignJob = async (campaign) => {
        const job = await campaignQueue.add('process-campaign', {
            campaignId: campaign.id,
            postUrl: campaign.postUrl,
            totalComments: campaign.totalComments,
            userId: campaign.userId,
            createdAt: new Date().toISOString()
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 50
        });
        console.log(`📋 Campaign job added: ${job.id}`);
        return job;
    };

    addAccountCreationJob = async (accountData) => {
        const job = await accountQueue.add('create-account', {
            ...accountData,
            createdAt: new Date().toISOString()
        }, {
            attempts: 2,
            backoff: { type: 'fixed', delay: 30000 }
        });
        console.log(`👤 Account creation job added: ${job.id}`);
        return job;
    };

    getQueueStats = async () => {
        const [waiting, active, completed, failed] = await Promise.all([
            campaignQueue.getWaitingCount(),
            campaignQueue.getActiveCount(),
            campaignQueue.getCompletedCount(),
            campaignQueue.getFailedCount()
        ]);

        return {
            campaigns: { waiting, active, completed, failed }
        };
    };
}

export {
    connection,
    campaignQueue,
    accountQueue,
    campaignEvents,
    addCampaignJob,
    addAccountCreationJob,
    getQueueStats
};

