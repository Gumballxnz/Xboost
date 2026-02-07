
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 50, 2000)
});

async function test() {
    try {
        console.log('🔌 Connecting to Redis...');
        await connection.ping();
        console.log('✅ Redis Connected!');

        const queue = new Queue('test-queue', { connection });

        console.log('📤 Adding job...');
        await queue.add('test', { message: 'Hello Redis!' });

        console.log('👷 Starting worker...');
        const worker = new Worker('test-queue', async (job) => {
            console.log('✅ Job processed:', job.data.message);
            return 'done';
        }, { connection });

        await new Promise(resolve => setTimeout(resolve, 2000));
        await worker.close();
        await queue.close();
        await connection.quit();
        console.log('🎉 Test passed!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Redis Error:', e.message);
        process.exit(1);
    }
}

test();
