// =====================================================
// CREATE_ACCOUNT.JS v3.2 - Com Stealth Mode Integrado
// =====================================================

import fs from 'fs-extra';
import imaps from 'imap-simple';
import colors from 'colors';
import readline from 'readline-sync';
import path from 'path';
import { fileURLToPath } from 'url';
import { GMAIL_USER, GMAIL_PASS, TWITTER_PASS, ACCOUNTS_DB } from '../config.js';
import proxyManager from './proxy_manager.js';
import { launchStealthBrowser, humanDelay, humanType, humanClick } from './humanize_browser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imapConfig = {
    imap: {
        user: GMAIL_USER,
        password: GMAIL_PASS,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 10000
    }
};

async function saveDebugInfo(page, prefix) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logsDir = path.join(__dirname, '../.tmp/logs');
        await fs.ensureDir(logsDir);
        const filePath = path.join(logsDir, `debug_${prefix}_${timestamp}.png`);
        await page.screenshot({ path: filePath });
        console.log(`📸 Debug salvo: ${filePath}`.yellow);
    } catch (err) {
        console.log(`⚠️ Erro ao salvar debug: ${err.message}`.yellow);
    }
}

function getNextAlias() {
    let accounts = [];
    if (fs.existsSync(ACCOUNTS_DB)) {
        try { accounts = fs.readJsonSync(ACCOUNTS_DB); } catch (e) { }
    }

    let maxId = 9;
    const regex = /\+(\d+)conta@/;
    accounts.forEach(acc => {
        const match = acc.email.match(regex);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxId) maxId = num;
        }
    });

    const nextId = maxId + 1;
    const parts = GMAIL_USER.split('@');
    const alias = `${parts[0]}+${nextId}conta@${parts[1]}`;

    const firstNames = ['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Jamie', 'Drew', 'Blake', 'Skyler'];
    const lastNames = ['Smith', 'Brown', 'Wilson', 'Miller', 'Davis', 'Garcia', 'Jones', 'Martinez', 'Anderson', 'Taylor'];
    const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${nextId}`;

    return { alias, id: nextId, name: randomName };
}

async function getTwitterCode(targetEmail, attempts = 20) {
    console.log(`📩 Aguardando email para: ${targetEmail}`.yellow);

    try {
        const connection = await imaps.connect(imapConfig);
        await connection.openBox('INBOX');

        for (let i = 0; i < attempts; i++) {
            console.log(`   ⏳ Tentativa ${i + 1}/${attempts}...`);
            await humanDelay(5000);

            const searchCriteria = ['UNSEEN', ['SINCE', new Date().toISOString().split('T')[0]]];
            const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: false };
            const messages = await connection.search(searchCriteria, fetchOptions);

            for (const item of messages) {
                const header = item.parts.find(p => p.which === 'HEADER');
                const subject = (header.body.subject[0] || '').toLowerCase();
                const to = (header.body.to[0] || '').toLowerCase();

                if (to.includes(targetEmail.toLowerCase()) || subject.includes('código') || subject.includes('code')) {
                    console.log('   📬 Email encontrado!'.green);

                    // Tenta extrair código do assunto
                    const codeMatch = subject.match(/\b\d{6}\b/);
                    if (codeMatch) {
                        connection.end();
                        return codeMatch[0];
                    }

                    // Tenta extrair do corpo
                    const allBody = await connection.getPartData(item, item.parts[0]);
                    const bodyMatch = allBody.toString().match(/\b\d{6}\b/);
                    if (bodyMatch) {
                        connection.end();
                        return bodyMatch[0];
                    }
                }
            }
        }

        connection.end();
        console.log('   ❌ Código não chegou.'.red);
        return null;

    } catch (e) {
        console.log(`   ❌ Erro IMAP: ${e.message}`.red);
        return null;
    }
}

async function createAccount() {
    console.log('\n🤖 CRIADOR DE CONTAS v3.2 (Stealth Mode)'.bgBlue.white);
    console.log('═'.repeat(50));

    // Obtem Proxy
    const proxy = proxyManager.getNextProxy();

    if (proxy) {
        console.log(`🌐 Proxy: ${proxy.server}`.magenta);
    } else {
        console.log('⚠️ Sem Proxy! Rodando IP Local (RISCO ALTO)'.bgYellow.black);
    }

    let accounts = [];
    if (fs.existsSync(ACCOUNTS_DB)) {
        try { accounts = fs.readJsonSync(ACCOUNTS_DB); } catch (e) { }
    }

    const { alias, id, name } = getNextAlias();
    console.log(`📧 Email: ${alias}`.cyan);
    console.log(`👤 Nome: ${name}`.cyan);
    console.log('');

    // Lança navegador com STEALTH
    let browser, page, fingerprint;
    try {
        const result = await launchStealthBrowser({
            proxy: proxy ? {
                server: proxy.server,
                username: proxy.username,
                password: proxy.password
            } : null,
            accountId: alias,
            headless: false
        });
        browser = result.browser;
        page = result.page;
        fingerprint = result.fingerprint;
    } catch (error) {
        console.log(`❌ Erro ao iniciar navegador: ${error.message}`.red);
        return;
    }

    try {
        console.log('🌍 Acessando Twitter...');
        await page.goto('https://twitter.com/i/flow/signup', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await humanDelay(3000);

        // Clica em "Create account" se aparecer
        try {
            const createBtn = await page.waitForSelector('span::-p-text(Create account)', { timeout: 8000 });
            if (createBtn) {
                await humanClick(page, 'span::-p-text(Create account)');
                await humanDelay(2000);
            }
        } catch (err) { }

        console.log('✍️ Preenchendo dados...');

        // Nome
        await page.waitForSelector('input[name="name"]', { timeout: 10000 });
        await humanType(page, 'input[name="name"]', name);
        await humanDelay(500);

        // Verifica se está pedindo telefone
        const isPhone = await page.$('input[name="phone_number"]');
        if (isPhone) {
            console.log('   📱 Pediu telefone, trocando para email...');
            try {
                await humanClick(page, 'span::-p-text(Use email instead)');
                await humanDelay(1000);
            } catch (e) { }
        }

        // Email
        await humanType(page, 'input[name="email"]', alias);
        await humanDelay(1000);

        // Data de Nascimento
        const randomYear = Math.floor(Math.random() * (2003 - 1990 + 1)) + 1990;
        console.log('   📅 Preenchendo data de nascimento...');

        const selects = await page.$$('select');
        if (selects.length >= 3) {
            await selects[0].select('1'); // Janeiro
            await humanDelay(300);
            await selects[1].select('15'); // Dia 15
            await humanDelay(300);
            await selects[2].select(randomYear.toString());
        } else {
            // Fallback: teclado
            console.log('   ⌨️ Usando teclado...');
            await page.focus('input[name="email"]');
            for (let i = 0; i < 3; i++) {
                await page.keyboard.press('Tab');
                await humanDelay(100);
            }
            await page.keyboard.type('Jan');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Tab');
            await page.keyboard.type('15');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Tab');
            await page.keyboard.type(randomYear.toString());
            await page.keyboard.press('Enter');
        }

        await humanDelay(2000);
        await page.keyboard.press('Escape');

        // Next
        console.log('   🔘 Clicando Next...');
        try {
            await humanClick(page, 'span::-p-text(Next)');
        } catch (e) {
            await page.keyboard.press('Enter');
        }
        await humanDelay(3000);

        // Segundo Next (se houver)
        try {
            const nextBtn2 = await page.waitForSelector('span::-p-text(Next)', { timeout: 3000 });
            if (nextBtn2) await humanClick(page, 'span::-p-text(Next)');
        } catch (e) { }
        await humanDelay(3000);

        // Sign up
        try {
            const signUp = await page.waitForSelector('span::-p-text(Sign up)', { timeout: 3000 });
            if (signUp) await humanClick(page, 'span::-p-text(Sign up)');
        } catch (e) {
            await page.keyboard.press('Enter');
        }

        console.log('\n⚠️  RESOLVA O CAPTCHA SE APARECER!'.bgRed.white);
        console.log('   (Timeout: 5 minutos)');

        await page.waitForFunction(() => {
            const body = document.body.innerText;
            return body.includes('code') || body.includes('código') ||
                document.querySelector('input[name="verfication_code"]');
        }, { timeout: 300000 });

        console.log('✅ Captcha passado! Buscando código...'.green);
        const code = await getTwitterCode(alias);

        if (!code) {
            throw new Error("Código não encontrado no email.");
        }

        console.log(`🔢 Código: ${code}`);
        await page.type('input[name="verfication_code"]', code);
        await humanDelay(500);
        await page.keyboard.press('Enter');
        await humanDelay(3000);

        // Senha
        console.log('🔑 Definindo senha...');
        await page.waitForSelector('input[name="password"]', { timeout: 10000 });
        await humanType(page, 'input[name="password"]', TWITTER_PASS);
        await humanDelay(500);
        await page.keyboard.press('Enter');
        await humanDelay(5000);

        // Salva conta
        const newAccount = {
            email: alias,
            username: `PendingCheck_${id}`,
            password: TWITTER_PASS,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            proxy: proxy ? proxy.original : 'localhost',
            fingerprint: {
                userAgent: fingerprint.userAgent,
                viewport: fingerprint.viewport
            }
        };

        if (fs.existsSync(ACCOUNTS_DB)) {
            try { accounts = fs.readJsonSync(ACCOUNTS_DB); } catch (e) { }
        }
        accounts.push(newAccount);
        fs.writeJsonSync(ACCOUNTS_DB, accounts, { spaces: 2 });

        console.log('\n' + '═'.repeat(50));
        console.log('✅ CONTA CRIADA COM SUCESSO!'.green.bold);
        console.log(JSON.stringify(newAccount, null, 2));
        console.log('═'.repeat(50));

        await humanDelay(3000);
        await browser.close();

    } catch (e) {
        console.log(`\n❌ ERRO: ${e.message}`.red);
        await saveDebugInfo(page, 'error_creator');
        await humanDelay(3000);
        await browser.close();
    }
}

createAccount();
