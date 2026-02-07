// =====================================================
// ROTATOR.JS v3.2 - Com Stealth Mode Integrado
// =====================================================

import fs from 'fs-extra';
import colors from 'colors';
import readline from 'readline-sync';
import path from 'path';
import { fileURLToPath } from 'url';
import { ACCOUNTS_DB } from '../config.js';
import proxyManager from './proxy_manager.js';
import { launchStealthBrowser, humanDelay, humanType, humanClick } from './humanize_browser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Spintax de comentários
const SPINTAX_COMMENTS = [
    '{Incrível|Muito bom|Top|Show|Excelente}! {Conteúdo|Post|Vídeo} {top demais|de qualidade|maravilhoso}. {👏|🔥|💯}',
    '{Adorei|Curti muito|Sensacional}! {Continue assim|Parabéns pelo trabalho}. {✅|👍|🙌}',
    '{Wow|Uau|Nossa}! {Isso é incrível|Que demais|Impressionante}. {😍|🤩|⭐}',
    '{Ótimo|Perfeito|Fantástico} {conteúdo|post}! {👏👏|🔥🔥}',
    '{Muito bom|Excelente|Incrível}! {Valeu por compartilhar|Obrigado por postar}. {🙏|✨}'
];

function expandSpintax(template) {
    return template.replace(/\{([^{}]+)\}/g, (match, options) => {
        const choices = options.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

function getRandomComment() {
    const template = SPINTAX_COMMENTS[Math.floor(Math.random() * SPINTAX_COMMENTS.length)];
    return expandSpintax(template);
}

async function saveDebugInfo(page, prefix) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logsDir = path.join(__dirname, '../.tmp/logs');
        await fs.ensureDir(logsDir);
        const filePath = path.join(logsDir, `debug_${prefix}_${timestamp}.png`);
        await page.screenshot({ path: filePath });
        console.log(`📸 Debug salvo: ${filePath}`.yellow);
    } catch (err) { }
}

async function login(page, account) {
    console.log(`🔑 Logando: ${account.username || account.email}...`);

    // Tenta cookies primeiro
    try {
        const cookieFile = path.join(__dirname, `../cookies_${account.username}.json`);
        if (fs.existsSync(cookieFile)) {
            console.log('   🍪 Tentando cookies...');
            const cookies = fs.readJsonSync(cookieFile);
            await page.setCookie(...cookies);
            await page.goto('https://twitter.com/home', { waitUntil: 'networkidle2', timeout: 60000 });
            await humanDelay(3000);

            if (await page.$('div[aria-label="Account menu"]')) {
                console.log('   ✅ Login via Cookies: SUCESSO!'.green);
                return true;
            }
            console.log('   ⚠️ Cookies inválidos, tentando senha...'.yellow);
        }
    } catch (e) { }

    // Login com senha
    try {
        await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2', timeout: 60000 });
        await humanDelay(3000);

        // Username
        const inputUser = await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
            .catch(() => page.$('input[name="text"]'));

        if (inputUser) {
            await humanType(page, 'input[autocomplete="username"]', account.username || account.email);
            await humanDelay(500);
            await page.keyboard.press('Enter');
        } else {
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.type(account.username || account.email);
            await page.keyboard.press('Enter');
        }
        await humanDelay(2000);

        // Verificação adicional (se pedida)
        const needsVerification = await page.evaluate(() => {
            return document.body.innerText.includes('Phone or email') ||
                document.body.innerText.includes('enter your phone');
        });

        if (needsVerification) {
            console.log('   📧 Verificação adicional solicitada...');
            const inputVerif = await page.waitForSelector('input[name="text"], input[name="email"]');
            await inputVerif.type(account.email);
            await page.keyboard.press('Enter');
            await humanDelay(2000);
        }

        // Senha
        const inputPass = await page.waitForSelector('input[name="password"]', { timeout: 10000 });
        await humanType(page, 'input[name="password"]', account.password);
        await humanDelay(500);
        await page.keyboard.press('Enter');
        await humanDelay(5000);

        // Verifica sucesso
        const loggedIn = await page.$('div[aria-label="Account menu"]');
        if (loggedIn) {
            console.log('   ✅ Login via Senha: SUCESSO!'.green);
            return true;
        }

        return false;

    } catch (e) {
        console.log(`   ❌ Erro Login: ${e.message}`.red);
        return false;
    }
}

async function commentOnPost(page, postUrl, message) {
    console.log(`💬 Navegando para o post...`.cyan);
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await humanDelay(5000);

    // Scroll suave
    await page.evaluate(() => window.scrollBy(0, 300));
    await humanDelay(1000);

    console.log('   🔍 Buscando caixa de resposta...');
    try {
        const replyBox = await page.waitForSelector('div[role="textbox"][data-testid="tweetTextarea_0"]', { timeout: 10000 });
        await replyBox.click();
        await humanDelay(500);

        console.log(`   ✍️ Escrevendo: "${message}"`);
        for (const char of message) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 80 });
            if (Math.random() < 0.03) await humanDelay(200);
        }
        await humanDelay(1000);

        console.log('   📤 Enviando...');
        const replyBtn = await page.waitForSelector('div[data-testid="tweetButtonInline"], div[data-testid="tweetButton"]', { timeout: 5000 });
        await replyBtn.click();

        await humanDelay(3000);
        console.log('   ✅ Comentário enviado!'.green);
        return true;

    } catch (e) {
        console.log(`   ❌ Erro ao comentar: ${e.message}`.red);
        await saveDebugInfo(page, 'error_comment');
        return false;
    }
}

async function startRotator() {
    console.log('\n🔄 ROTATOR v3.2 (Stealth Mode)'.bgBlue.white);
    console.log('═'.repeat(50));

    if (!fs.existsSync(ACCOUNTS_DB)) {
        console.log('❌ Banco de contas não encontrado!'.red);
        return;
    }

    const accounts = fs.readJsonSync(ACCOUNTS_DB);
    const activeAccounts = accounts.filter(a => a.status === 'ACTIVE');

    if (activeAccounts.length === 0) {
        console.log('❌ Nenhuma conta ATIVA encontrada.'.red);
        return;
    }

    console.log(`📊 Contas disponíveis: ${activeAccounts.length}`);
    console.log('');

    // URL do post
    const defaultUrl = 'https://x.com/i/status/2011749946299727883';
    console.log(`🔗 Post Alvo (Enter para padrão):`);
    console.log(`   ${defaultUrl}`.gray);

    let targetUrl = process.argv[2] || readline.question('Link: ');
    if (!targetUrl || targetUrl.trim() === '') {
        targetUrl = defaultUrl;
    }

    let successCount = 0;
    let failCount = 0;

    for (const [index, account] of activeAccounts.entries()) {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`👤 [${index + 1}/${activeAccounts.length}] ${account.username || account.email}`);

        // Sticky Proxy
        let proxy = null;
        if (account.proxy && account.proxy !== 'localhost') {
            console.log(`   ♻️ Usando proxy da conta: ${account.proxy.split(':')[0]}:${account.proxy.split(':')[1]}`);
            proxy = proxyManager.parseProxy(account.proxy);
        }

        if (!proxy) {
            console.log(`   ⚠️ Sem proxy sticky. Pulando conta para segurança.`.yellow);
            failCount++;
            continue;
        }

        // Lança navegador Stealth
        let browser, page;
        try {
            const result = await launchStealthBrowser({
                proxy: {
                    server: proxy.server,
                    username: proxy.username,
                    password: proxy.password
                },
                accountId: account.email,
                headless: false
            });
            browser = result.browser;
            page = result.page;
        } catch (error) {
            console.log(`   ❌ Erro ao iniciar navegador: ${error.message}`.red);
            failCount++;
            continue;
        }

        try {
            const loginSuccess = await login(page, account);

            if (!loginSuccess) {
                console.log(`   ⚠️ Marcando conta como LIMITED`.yellow);
                account.status = 'LIMITED';
                fs.writeJsonSync(ACCOUNTS_DB, accounts, { spaces: 2 });
                await browser.close();
                failCount++;
                continue;
            }

            const message = getRandomComment();
            const commentSuccess = await commentOnPost(page, targetUrl, message);

            if (commentSuccess) {
                successCount++;
            } else {
                failCount++;
            }

            // Limpa sessão
            console.log('   🧹 Limpando sessão...');
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            await client.send('Network.clearBrowserCache');

        } catch (e) {
            console.log(`   ❌ Erro: ${e.message}`.red);
            failCount++;
        }

        await browser.close();

        // Delay entre contas
        const delay = 5000 + Math.random() * 10000;
        console.log(`   ⏳ Aguardando ${Math.round(delay / 1000)}s...`);
        await humanDelay(delay);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('🏁 CICLO FINALIZADO'.green.bold);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Falhas: ${failCount}`);
    console.log('═'.repeat(50));
}

startRotator();
