// =====================================================
// CREATE_ACCOUNT.JS - Node.js Puppeteer Implementation
// Ported from account_creator.py
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

// --- CONFIGURAÇÃO ---
const CONFIG = {
    SCREENSHOTS_DIR: path.join(__dirname, '../../screenshots'),
    HEADLESS: process.argv.includes('--headless') ? 'new' : false
};

// --- UTILS ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function saveScreenshot(page, name) {
    fs.ensureDirSync(CONFIG.SCREENSHOTS_DIR);
    const filepath = path.join(CONFIG.SCREENSHOTS_DIR, `${name}_${Date.now()}.png`);
    await page.screenshot({ path: filepath });
    console.log(`📸 Screenshot salvo: ${filepath}`);
}

// --- MAIN LOGIC ---
async function createAccount(accountData) {
    console.log(`🚀 Iniciando criação de conta para: ${accountData.email}`);

    const browser = await puppeteer.launch({
        headless: CONFIG.HEADLESS,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        executablePath: executablePath(),
        defaultViewport: null
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // 1. Navegar para Signup
        console.log('📱 Acessando Twitter Signup...');
        await page.goto('https://twitter.com/i/flow/signup', { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(3000);

        // 2. Preencher Formulário (Simulado por enquanto)
        console.log('📝 Preenchendo formulário...');

        // Seletor de Nome
        const nameInput = await page.waitForSelector('input[name="name"]', { timeout: 10000 }).catch(() => null);
        if (nameInput) {
            await nameInput.type(accountData.name || 'User Test');
            await delay(500);
        } else {
            throw new Error('Campo de nome não encontrado');
        }

        // Seletor de Email
        const emailInput = await page.waitForSelector('input[name="email"]', { timeout: 5000 }).catch(() => null);
        if (emailInput) {
            await emailInput.type(accountData.email);
            await delay(500);
        } else {
            // Pode ser que peça telefone primeiro, precisamos clicar em "Usar email"
            const useEmailBtn = await page.$('span:has-text("Usar e-mail")'); // Ajustar seletor
            if (useEmailBtn) {
                await useEmailBtn.click();
                await delay(1000);
                await page.type('input[name="email"]', accountData.email);
            }
        }

        // 3. CAPTCHA Handling (Placeholder)
        // Aqui entrarai a lógica do 2captcha ou similar
        console.log('🔍 Verificando CAPTCHA...');
        // await solveCaptcha(page); 

        console.log('✅ Form preenchido (Simulação)');
        // Em produção real, avançaríamos os passos e esperaríamos o código de email

    } catch (error) {
        console.error(`❌ Erro na criação: ${error.message}`);
        if (browser) {
            const page = (await browser.pages())[0];
            if (page) await saveScreenshot(page, 'error_creation');
        }
    } finally {
        await browser.close();
    }
}

// --- EXECUTION ---
// Ex: node create_account.js --email test@test.com --name "Test User"
(async () => {
    const args = process.argv.slice(2);
    const emailIndex = args.indexOf('--email');
    const nameIndex = args.indexOf('--name');

    if (emailIndex === -1) {
        console.log('⚠️ Uso direto requer --email');
        // Se chamado via import, não faz nada
        return;
    }

    const accountData = {
        email: args[emailIndex + 1],
        name: nameIndex !== -1 ? args[nameIndex + 1] : 'Novo Usuário'
    };

    await createAccount(accountData);
})();
