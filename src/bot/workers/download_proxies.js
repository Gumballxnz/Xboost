import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = 'demkflre6xm8l6boy6dz4uhh29mdh2h5risxkwiw';
const TARGET_FILE = path.join(__dirname, '../proxies.txt');

async function downloadProxies() {
    console.log('🔄 Baixando proxies do Webshare (via fetch)...');

    try {
        const response = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=100', {
            headers: { 'Authorization': `Token ${API_KEY}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.results) {
            const proxies = data.results.map(p => {
                return `${p.proxy_address}:${p.port}:${p.username}:${p.password}`;
            });

            const content = proxies.join('\n');
            fs.writeFileSync(TARGET_FILE, content);

            console.log(`✅ Sucesso! ${proxies.length} proxies salvos em:`);
            console.log(TARGET_FILE);
            if (proxies.length > 0) console.log('Exemplo:', proxies[0]);
        } else {
            console.log('❌ Resposta inesperada da API:', data);
        }

    } catch (error) {
        console.error('❌ Erro no download:', error.message);
    }
}

downloadProxies();
