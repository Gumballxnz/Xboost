import axios from 'axios';

(async () => {
    try {
        console.log('Testing Static Files...');

        // Test Root
        console.log('Fetching / ...');
        const root = await axios.get('http://localhost:3000/');
        console.log('✅ / Status:', root.status);

        // Test Auth
        console.log('Fetching /auth.html ...');
        const auth = await axios.get('http://localhost:3000/auth.html');
        console.log('✅ /auth.html Status:', auth.status);
        console.log('Bytes:', auth.data.length);

    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', e.response.data);
        }
    }
})();
