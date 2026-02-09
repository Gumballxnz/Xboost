import axios from 'axios';

async function test() {
    console.log('🧪 Testing Backend...');
    try {
        const res = await axios.get('http://localhost:3000/health');
        console.log('✅ Health Check:', res.data);
    } catch (e) {
        console.error('❌ Health Check Failed:', e.message);
    }

    try {
        await axios.get('http://localhost:3000/api/admin/stats');
        console.error('❌ Admin Route should require Auth!');
    } catch (e) {
        if (e.response && e.response.status === 401) {
            console.log('✅ Admin Route Protected (401 Unauthorized)');
        } else {
            console.error('❌ Admin Route Failed with unexpected error:', e.message);
        }
    }
}

test();
