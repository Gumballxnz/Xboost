// =====================================================
// QUEUE.JS - BullMQ Configuration for XBoost SaaS
// =====================================================
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection (use environment variables in production)
const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
};

// Create Redis connection
const connection = new IORedis(REDIS_CONFIG);

// ================== QUEUES ==================

// Vercel Serverless Optimization:
// If on Vercel, DO NOT connect to Redis. Return dummy objects.
const isVercel = process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV;

if (isVercel) {
    console.log('⚡ Vercel Environment: Skipping Redis Queue initialization.');
    export const campaignQueue = { add: async () => ({ id: 'mock-job-id' }) };
    export const accountQueue = { add: async () => ({ id: 'mock-job-id' }) };
    export const campaignEvents = { on: () => { } };
    export function addCampaignJob() { console.log('Mock addCampaignJob'); }
    export function addAccountCreationJob() { console.log('Mock addAccountCreationJob'); }
    export function getQueueStats() { return { campaigns: { waiting: 0, active: 0, completed: 0, failed: 0 } }; }
    export const connection = null;
} else {
    // Normal Redis Initialization (Local/VPS)
    export const campaignQueue = new Queue('campaigns', { connection });
    export const accountQueue = new Queue('accounts', { connection });
    export const campaignEvents = new QueueEvents('campaigns', { connection });
    // ... (Functions below will use these queues)
}

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

// ================== JOB CREATORS ==================

/**
 * Add a campaign job to the queue
 * @param {Object} campaign - Campaign data
 * @param {string} campaign.id - Campaign ID
 * @param {string} campaign.postUrl - Twitter post URL
 * @param {number} campaign.totalComments - Number of comments to post
 * @param {string} campaign.userId - User who created the campaign
 */
export async function addCampaignJob(campaign) {
    const job = await campaignQueue.add('process-campaign', {
        campaignId: campaign.id,
        postUrl: campaign.postUrl,
        totalComments: campaign.totalComments,
        userId: campaign.userId,
        createdAt: new Date().toISOString()
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 50
    });

    console.log(`📋 Campaign job added: ${job.id}`);
    return job;
}

/**
 * Add an account creation job to the queue
 * @param {Object} accountData - Account data
 */
export async function addAccountCreationJob(accountData) {
    const job = await accountQueue.add('create-account', {
        ...accountData,
        createdAt: new Date().toISOString()
    }, {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 30000
        }
    });

    console.log(`👤 Account creation job added: ${job.id}`);
    return job;
}

// ================== QUEUE STATS ==================

export async function getQueueStats() {
    const [
        campaignWaiting,
        campaignActive,
        campaignCompleted,
        campaignFailed
    ] = await Promise.all([
        campaignQueue.getWaitingCount(),
        campaignQueue.getActiveCount(),
        campaignQueue.getCompletedCount(),
        campaignQueue.getFailedCount()
    ]);

    return {
        campaigns: {
            waiting: campaignWaiting,
            active: campaignActive,
            completed: campaignCompleted,
            failed: campaignFailed
        }
    };
}

export { connection };
