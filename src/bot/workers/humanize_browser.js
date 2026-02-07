// =====================================================
// HUMANIZE_BROWSER.JS - Puppeteer com Stealth Mode
// =====================================================
// Configura navegador para evitar detecção de bot

import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs-extra';
import path from 'path';

// Ativa Stealth Plugin
puppeteerExtra.use(StealthPlugin());

// Fingerprints realistas para rotação
const FINGERPRINTS = [
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', viewport: { width: 1920, height: 1080 } },
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', viewport: { width: 1366, height: 768 } },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', viewport: { width: 1440, height: 900 } },
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0', viewport: { width: 1680, height: 1050 } },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15', viewport: { width: 1280, height: 800 } },
];

/**
 * Retorna um fingerprint aleatório ou específico para uma conta
 * @param {string} accountId - ID único da conta (para consistência)
 */
export function getFingerprint(accountId = null) {
    if (accountId) {
        // Hash simples para consistência por conta
        const hash = accountId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        return FINGERPRINTS[hash % FINGERPRINTS.length];
    }
    return FINGERPRINTS[Math.floor(Math.random() * FINGERPRINTS.length)];
}

/**
 * Delay humanizado com variação
 * @param {number} baseMs - Tempo base em ms
 * @param {number} variance - Variação máxima (%)
 */
export async function humanDelay(baseMs, variance = 0.3) {
    const variation = baseMs * variance * (Math.random() - 0.5) * 2;
    const finalDelay = Math.max(100, baseMs + variation);
    await new Promise(r => setTimeout(r, finalDelay));
}

/**
 * Digitação humanizada (velocidade variável)
 * @param {Page} page - Página Puppeteer
 * @param {string} selector - Seletor do input
 * @param {string} text - Texto a digitar
 */
export async function humanType(page, selector, text) {
    const element = await page.waitForSelector(selector);
    await element.click();
    await humanDelay(200);

    for (const char of text) {
        await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
        // Pausa aleatória ocasional (simula hesitação)
        if (Math.random() < 0.05) {
            await humanDelay(300);
        }
    }
}

/**
 * Movimento de mouse humanizado antes de clicar
 * @param {Page} page - Página Puppeteer
 * @param {string} selector - Seletor do elemento
 */
export async function humanClick(page, selector) {
    const element = await page.waitForSelector(selector);
    const box = await element.boundingBox();

    if (box) {
        // Move para posição aleatória dentro do elemento
        const x = box.x + box.width * (0.3 + Math.random() * 0.4);
        const y = box.y + box.height * (0.3 + Math.random() * 0.4);

        await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 10) });
        await humanDelay(100);
        await page.mouse.click(x, y);
    } else {
        await element.click();
    }
}

/**
 * Lança navegador configurado com stealth e proxy
 * @param {Object} options - Opções de configuração
 * @param {Object} options.proxy - Objeto proxy {server, username, password}
 * @param {string} options.accountId - ID da conta para fingerprint consistente
 * @param {boolean} options.headless - Modo headless (default: false)
 */
export async function launchStealthBrowser(options = {}) {
    const { proxy, accountId, headless = false } = options;
    const fingerprint = getFingerprint(accountId);

    const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        `--window-size=${fingerprint.viewport.width},${fingerprint.viewport.height}`,
    ];

    if (proxy) {
        launchArgs.push(`--proxy-server=${proxy.server}`);
    }

    const browser = await puppeteerExtra.launch({
        headless,
        args: launchArgs,
        defaultViewport: fingerprint.viewport,
    });

    const page = await browser.newPage();

    // Configura User-Agent
    await page.setUserAgent(fingerprint.userAgent);

    // Autenticação de Proxy
    if (proxy && proxy.username && proxy.password) {
        await page.authenticate({
            username: proxy.username,
            password: proxy.password
        });
    }

    // Esconde WebDriver
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // Adiciona plugins falsos
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' },
            ]
        });
    });

    console.log(`🛡️ Navegador Stealth iniciado (UA: ${fingerprint.userAgent.substring(0, 50)}...)`.green);

    return { browser, page, fingerprint };
}

export default {
    launchStealthBrowser,
    humanDelay,
    humanType,
    humanClick,
    getFingerprint
};
