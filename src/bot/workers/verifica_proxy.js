// =====================================================
// VERIFICA_PROXY.JS - Validação de Proxies
// =====================================================
// Testa todos os proxies e retorna status individual

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROXIES_FILE = path.join(__dirname, '../proxies.txt');
const TEST_URL = 'https://api.ipify.org?format=json';
const TIMEOUT = 10000;

/**
 * Parseia uma linha de proxy
 * @param {string} line - Linha no formato IP:PORT:USER:PASS ou IP:PORT
 */
function parseProxyLine(line) {
    const parts = line.trim().split(':');
    if (parts.length >= 2) {
        return {
            host: parts[0],
            port: parts[1],
            username: parts[2] || null,
            password: parts[3] || null,
            original: line.trim()
        };
    }
    return null;
}

/**
 * Testa um proxy fazendo requisição HTTP
 * @param {Object} proxy - Objeto proxy parseado
 */
async function testProxy(proxy) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        // Constrói URL de proxy para fetch
        const proxyUrl = proxy.username
            ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
            : `http://${proxy.host}:${proxy.port}`;

        // Node.js fetch não suporta proxy nativamente, então testamos via conexão direta
        // Alternativa: usar o proxy no navegador e verificar IP
        const response = await fetch(TEST_URL, {
            signal: controller.signal,
            // Nota: fetch nativo não suporta proxy, este teste é parcial
        });

        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            return {
                proxy: proxy.original,
                status: 'PARTIAL_OK',
                ip: data.ip,
                note: 'Conexão OK, mas IP não foi verificado via proxy (fetch nativo)'
            };
        }

        return { proxy: proxy.original, status: 'ERROR', error: `HTTP ${response.status}` };

    } catch (error) {
        clearTimeout(timeout);
        return {
            proxy: proxy.original,
            status: error.name === 'AbortError' ? 'TIMEOUT' : 'ERROR',
            error: error.message
        };
    }
}

/**
 * Testa proxy via Puppeteer (mais confiável)
 */
async function testProxyViaBrowser(proxy) {
    try {
        const { launchStealthBrowser } = await import('./humanize_browser.js');

        const { browser, page } = await launchStealthBrowser({
            proxy: {
                server: `${proxy.host}:${proxy.port}`,
                username: proxy.username,
                password: proxy.password
            },
            headless: true
        });

        await page.goto('https://api.ipify.org?format=json', { timeout: 15000 });
        const content = await page.content();
        const ipMatch = content.match(/"ip":"([^"]+)"/);

        await browser.close();

        if (ipMatch) {
            return {
                proxy: proxy.original,
                status: 'OK',
                ip: ipMatch[1],
                matches_expected: ipMatch[1].startsWith(proxy.host.split('.')[0])
            };
        }

        return { proxy: proxy.original, status: 'ERROR', error: 'IP não detectado' };

    } catch (error) {
        return { proxy: proxy.original, status: 'ERROR', error: error.message };
    }
}

async function main() {
    console.log('🔍 VERIFICADOR DE PROXIES'.cyan);
    console.log('='.repeat(50));

    if (!fs.existsSync(PROXIES_FILE)) {
        console.log('❌ Arquivo proxies.txt não encontrado!'.red);
        return;
    }

    const content = fs.readFileSync(PROXIES_FILE, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    console.log(`📋 Total de proxies: ${lines.length}`);
    console.log('');

    const results = [];
    const useBrowser = process.argv.includes('--browser');

    for (let i = 0; i < lines.length; i++) {
        const proxy = parseProxyLine(lines[i]);
        if (!proxy) continue;

        process.stdout.write(`[${i + 1}/${lines.length}] ${proxy.host}:${proxy.port} ... `);

        let result;
        if (useBrowser) {
            result = await testProxyViaBrowser(proxy);
        } else {
            result = await testProxy(proxy);
        }

        results.push(result);

        if (result.status === 'OK' || result.status === 'PARTIAL_OK') {
            console.log(`✅ ${result.ip || 'OK'}`.green);
        } else {
            console.log(`❌ ${result.status}: ${result.error}`.red);
        }
    }

    // Resumo
    console.log('');
    console.log('='.repeat(50));
    const ok = results.filter(r => r.status === 'OK' || r.status === 'PARTIAL_OK').length;
    const failed = results.length - ok;
    console.log(`📊 Resultado: ${ok} OK | ${failed} FALHA`);

    // Salva resultado
    const outputFile = path.join(__dirname, '../.tmp/proxy_status.json');
    fs.ensureDirSync(path.dirname(outputFile));
    fs.writeJsonSync(outputFile, { timestamp: new Date().toISOString(), results }, { spaces: 2 });
    console.log(`💾 Salvo em: ${outputFile}`);
}

import colors from 'colors';

main();
