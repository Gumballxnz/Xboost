import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do arquivo de proxies (Sobe um nível para a raiz do bot)
const PROXY_FILE = path.join(__dirname, '../proxies.txt');

class ProxyManager {
    constructor() {
        this.proxies = [];
        this.currentIndex = 0;
        this.loadProxies();
    }

    loadProxies() {
        try {
            if (!fs.existsSync(PROXY_FILE)) {
                console.log('⚠️ Arquivo proxies.txt não encontrado. Criando vazio...'.yellow);
                // Cria na raiz
                fs.writeFileSync(PROXY_FILE, '# Insira seus proxies aqui (IP:PORT:USER:PASS)\n');
                return;
            }

            const content = fs.readFileSync(PROXY_FILE, 'utf-8');
            this.proxies = content.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#')); // Ignora vazios e comentários

            if (this.proxies.length > 0) {
                console.log(`✅ ${this.proxies.length} proxies carregados com sucesso.`.green);
            } else {
                console.log('⚠️ Nenhuma proxy válida encontrada em proxies.txt.'.yellow);
            }
        } catch (error) {
            console.error(`❌ Erro ao carregar proxies: ${error.message}`.red);
        }
    }

    getNextProxy() {
        if (this.proxies.length === 0) return null;

        const proxyString = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length; // Rotação Round-Robin

        return this.parseProxy(proxyString);
    }

    getRandomProxy() {
        if (this.proxies.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * this.proxies.length);
        return this.parseProxy(this.proxies[randomIndex]);
    }

    parseProxy(proxyString) {
        // Formatos suportados:
        // IP:PORT:USER:PASS
        // IP:PORT

        const parts = proxyString.split(':');

        if (parts.length === 4) {
            return {
                server: `${parts[0]}:${parts[1]}`, // IP:PORT para o Puppeteer
                username: parts[2],
                password: parts[3],
                original: proxyString
            };
        } else if (parts.length === 2) {
            return {
                server: `${parts[0]}:${parts[1]}`,
                username: null,
                password: null,
                original: proxyString
            };
        } else {
            console.log(`⚠️ Formato de proxy inválido: ${proxyString}`.yellow);
            return null;
        }
    }
}

// Exporta uma instância única (Singleton)
export default new ProxyManager();
