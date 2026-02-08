// =====================================================
// ROTATOR.JS - Comment Automation (Headless)
// =====================================================
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const CONFIG = {
    SCREENSHOTS_DIR: path.join(__dirname, '../../screenshots'),
    HEADLESS: process.argv.includes('--headless') ? 'new' : false
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runRotator(targetUrl, count) {
    console.log(`♻️ Iniciando Rotator. Alvo: ${targetUrl}, Qtd: ${count}`);

    const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security'
        ],
        executablePath: executablePath(),
        defaultViewport: null
    });

    // 1. Carregar Contas (Simulação)
    // Na versão final, isso viria do accounts_db.json

    try {
        const page = await browser.newPage();

        // Simulação de Loop de Comentários
        for (let i = 0; i < count; i++) {
            console.log(`💬 Comentário #${i + 1}/${count} em andamento...`);

            // Navegar para o post
            // await page.goto(targetUrl);

            // Login (se necessário) -> Comentar -> Logout

            await delay(1000); // Simula ação

            console.log(`✅ Comentário #${i + 1} feito.`);
        }

    } catch (error) {
        console.error(`❌ Erro no Rotator: ${error.message}`);
    } finally {
        await browser.close();
    }
}

// CLI Execution
(async () => {
    const args = process.argv.slice(2);
    const target = args[0]; // Argumento posicional 1
    const count = args[1] || 1; // Argumento posicional 2

    if (!target) {
        console.error('⚠️ Uso: node rotator.js <url_post> [qtd]');
        // process.exit(1); 
        // Não dar exit 1 se for chamado sem args para teste, apenas loga.
        return;
    }

    await runRotator(target, parseInt(count));
})();
