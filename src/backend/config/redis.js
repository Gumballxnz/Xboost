
require('dotenv').config({ path: '../../.env' }); // Load from root .env if needed
const IORedis = require('ioredis');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy: (times) => Math.min(times * 50, 2000)
};

const connection = new IORedis(redisConfig);

connection.on('connect', () => console.log('✅ Redis Connected!'));
connection.on('error', (err) => console.error('❌ Redis Connection Error:', err));

module.exports = connection;
