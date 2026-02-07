// =====================================================
// MANAGER.JS - ORQUESTRADOR v2.0 (3-Layer Architecture)
// =====================================================

import fs from 'fs-extra';
import { spawn } from 'child_process';
import readline from 'readline-sync';
import colors from 'colors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO ---
const CONFIG = {
    ACCOUNTS_DB: path.join(__dirname, 'accounts_db.json'),
    PROXIES_FILE: path.join(__dirname, 'proxies.txt'),
    TASK_QUEUE_FILE: path.join(__dirname, '.tmp/task_queue.json'),
    LOG_FILE: path.join(__dirname, '.tmp/orchestrator.log'),
    MAX_RETRIES: 3,
    DELAY_BETWEEN_TASKS_MS: 5000
};

// --- LOGGING ---
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}`;

    switch (level) {
        case 'ERROR': console.log(logLine.red); break;
        case 'SUCCESS': console.log(logLine.green); break;
        case 'WARN': console.log(logLine.yellow); break;
        default: console.log(logLine);
    }

    fs.ensureDirSync(path.dirname(CONFIG.LOG_FILE));
    fs.appendFileSync(CONFIG.LOG_FILE, logLine + '\n');
}

// --- CARREGAR PROXIES ---
function loadProxies() {
    if (!fs.existsSync(CONFIG.PROXIES_FILE)) return [];
    const content = fs.readFileSync(CONFIG.PROXIES_FILE, 'utf-8');
    return content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
}

// --- CARREGAR CONTAS ---
function loadAccounts() {
    if (!fs.existsSync(CONFIG.ACCOUNTS_DB)) return [];
    try { return fs.readJsonSync(CONFIG.ACCOUNTS_DB); } catch (e) { return []; }
}

// --- SALVAR CONTAS ---
function saveAccounts(accounts) {
    fs.writeJsonSync(CONFIG.ACCOUNTS_DB, accounts, { spaces: 2 });
}

// --- FILA DE TAREFAS ---
function loadTaskQueue() {
    if (!fs.existsSync(CONFIG.TASK_QUEUE_FILE)) return [];
    try { return fs.readJsonSync(CONFIG.TASK_QUEUE_FILE); } catch (e) { return []; }
}

function saveTaskQueue(queue) {
    fs.ensureDirSync(path.dirname(CONFIG.TASK_QUEUE_FILE));
    fs.writeJsonSync(CONFIG.TASK_QUEUE_FILE, queue, { spaces: 2 });
}

function addTask(task) {
    const queue = loadTaskQueue();
    const newTask = {
        ...task,
        id: Date.now(),
        status: 'PENDING',
        retries: 0,
        created_at: new Date().toISOString()
    };
    queue.push(newTask);
    saveTaskQueue(queue);
    log(`Tarefa #${newTask.id} adicionada: ${task.type} -> ${task.target || 'N/A'}`);
    return newTask;
}

// --- EXECUTAR SCRIPT (Layer 3) ---
function runScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
        const fullPath = path.join(__dirname, scriptPath);
        log(`Executando: node ${fullPath}`);

        if (!fs.existsSync(fullPath)) {
            log(`Script não encontrado: ${fullPath}`, 'ERROR');
            reject(new Error(`Script not found: ${fullPath}`));
            return;
        }

        const child = spawn('node', [fullPath, ...args], {
            stdio: 'inherit',
            cwd: __dirname
        });

        child.on('close', (code) => {
            if (code === 0) {
                log(`Script ${path.basename(fullPath)} concluído.`, 'SUCCESS');
                resolve(code);
            } else {
                log(`Script ${path.basename(fullPath)} falhou (code ${code}).`, 'ERROR');
                reject(new Error(`Exit code ${code}`));
            }
        });

        child.on('error', (err) => {
            log(`Erro ao executar ${path.basename(fullPath)}: ${err.message}`, 'ERROR');
            reject(err);
        });
    });
}

// --- PROCESSAR FILA ---
async function processTaskQueue() {
    const queue = loadTaskQueue();
    const pendingTasks = queue.filter(t => t.status === 'PENDING');

    if (pendingTasks.length === 0) {
        log('Fila vazia. Nenhuma tarefa pendente.');
        return;
    }

    log(`Processando ${pendingTasks.length} tarefas...`);

    for (const task of pendingTasks) {
        log(`\n📋 Tarefa #${task.id}: ${task.type}`);

        try {
            switch (task.type) {
                case 'CREATE_ACCOUNT':
                    await runScript('execution/create_account.js');
                    break;
                case 'COMMENT':
                    if (!task.target) throw new Error('URL do post não especificada');
                    await runScript('execution/rotator.js', [task.target]);
                    break;
                case 'VALIDATE_PROXIES':
                    await runScript('execution/verifica_proxy.js');
                    break;
                case 'VALIDATE_ACCOUNTS':
                    await runScript('execution/validate_account.js');
                    break;
                default:
                    log(`Tipo de tarefa desconhecido: ${task.type}`, 'ERROR');
                    task.status = 'FAILED';
                    continue;
            }

            task.status = 'COMPLETED';
            task.completed_at = new Date().toISOString();
            log(`Tarefa #${task.id} concluída!`, 'SUCCESS');

        } catch (error) {
            task.retries++;
            task.last_error = error.message;

            if (task.retries >= CONFIG.MAX_RETRIES) {
                task.status = 'FAILED';
                log(`Tarefa #${task.id} falhou permanentemente após ${task.retries} tentativas.`, 'ERROR');
            } else {
                log(`Tarefa #${task.id} será re-tentada (${task.retries}/${CONFIG.MAX_RETRIES}).`, 'WARN');
            }
        }

        saveTaskQueue(queue);

        // Delay humanizado entre tarefas
        const delay = CONFIG.DELAY_BETWEEN_TASKS_MS + Math.random() * 3000;
        await new Promise(r => setTimeout(r, delay));
    }

    // Resumo final
    const completed = queue.filter(t => t.status === 'COMPLETED').length;
    const failed = queue.filter(t => t.status === 'FAILED').length;
    const pending = queue.filter(t => t.status === 'PENDING').length;
    log(`\n📊 Resumo: ${completed} completas | ${failed} falhas | ${pending} pendentes`);
}

// --- LIMPAR CONSOLE ---
function clear() {
    process.stdout.write('\x1Bc');
}

// --- MENU PRINCIPAL ---
async function mainMenu() {
    clear();
    const accounts = loadAccounts();
    const proxies = loadProxies();
    const queue = loadTaskQueue();
    const activeAccounts = accounts.filter(a => a.status === 'ACTIVE').length;
    const pendingTasks = queue.filter(t => t.status === 'PENDING').length;

    console.log('╔════════════════════════════════════════════════════╗'.cyan);
    console.log('║     🐦 TWITTER BOT ORCHESTRATOR v2.0               ║'.cyan.bold);
    console.log('╠════════════════════════════════════════════════════╣'.cyan);
    console.log(`║  📊 Contas: ${activeAccounts}/${accounts.length} ativas | Proxies: ${proxies.length} | Fila: ${pendingTasks}`.padEnd(54) + '║'.cyan);
    console.log('╠════════════════════════════════════════════════════╣'.cyan);
    console.log('║  1. 🤖 Criar Nova Conta                            ║');
    console.log('║  2. ♻️  Iniciar Rotação de Comentários              ║');
    console.log('║  3. 🔍 Verificar Proxies                           ║');
    console.log('║  ───────────────────────────────────────────────── ║');
    console.log('║  4. 📋 Adicionar Tarefa à Fila                     ║');
    console.log('║  5. ⚙️  Processar Fila de Tarefas                   ║');
    console.log('║  6. 📜 Ver Fila Atual                              ║');
    console.log('║  ───────────────────────────────────────────────── ║');
    console.log('║  7. 📊 Status Detalhado                            ║');
    console.log('║  8. 🧹 Limpar Fila (Completadas/Falhas)            ║');
    console.log('║  0. 🚪 Sair                                        ║');
    console.log('╚════════════════════════════════════════════════════╝'.cyan);

    const choice = readline.question('Opção: ');

    switch (choice) {
        case '1':
            clear();
            await runScript('execution/create_account.js');
            break;

        case '2':
            clear();
            await runScript('execution/rotator.js');
            break;

        case '3':
            clear();
            console.log('Escolha o modo de verificação:');
            console.log('1. Rápido (HTTP fetch)');
            console.log('2. Completo (via navegador)');
            const mode = readline.question('Modo: ');
            if (mode === '2') {
                await runScript('execution/verifica_proxy.js', ['--browser']);
            } else {
                await runScript('execution/verifica_proxy.js');
            }
            break;

        case '4':
            clear();
            console.log('Tipos de tarefa disponíveis:');
            console.log('  CREATE_ACCOUNT - Criar nova conta');
            console.log('  COMMENT - Comentar em post');
            console.log('  VALIDATE_PROXIES - Verificar proxies');
            const taskType = readline.question('Tipo: ').toUpperCase();
            let target = null;
            if (taskType === 'COMMENT') {
                target = readline.question('URL do post: ');
            }
            addTask({ type: taskType, target });
            console.log('✅ Tarefa adicionada!'.green);
            break;

        case '5':
            clear();
            await processTaskQueue();
            break;

        case '6':
            clear();
            const currentQueue = loadTaskQueue();
            console.log('\n📋 FILA DE TAREFAS'.cyan);
            console.log('─'.repeat(60));
            if (currentQueue.length === 0) {
                console.log('(vazia)');
            } else {
                currentQueue.forEach(t => {
                    const statusIcon = t.status === 'COMPLETED' ? '✅' : t.status === 'FAILED' ? '❌' : '⏳';
                    console.log(`${statusIcon} #${t.id} | ${t.type} | ${t.status} | ${t.target || '-'}`);
                });
            }
            break;

        case '7':
            clear();
            console.log('\n📊 STATUS DO SISTEMA'.cyan);
            console.log('─'.repeat(60));
            console.log(`Contas Totais: ${accounts.length}`);
            console.log(`Contas Ativas: ${activeAccounts}`);
            console.log(`Contas Suspensas: ${accounts.filter(a => a.status === 'SUSPENDED').length}`);
            console.log(`Proxies Configurados: ${proxies.length}`);
            console.log(`Tarefas na Fila: ${pendingTasks}`);
            console.log(`Tarefas Completadas: ${queue.filter(t => t.status === 'COMPLETED').length}`);
            console.log(`Tarefas Falhas: ${queue.filter(t => t.status === 'FAILED').length}`);
            break;

        case '8':
            const cleanQueue = loadTaskQueue().filter(t => t.status === 'PENDING');
            saveTaskQueue(cleanQueue);
            console.log('🧹 Fila limpa!'.green);
            break;

        case '0':
            log('Orquestrador encerrado.');
            process.exit(0);
            break;

        default:
            console.log('Opção inválida.'.yellow);
    }

    readline.question('\nPressione ENTER para continuar...');
    await mainMenu();
}

// --- INICIALIZAÇÃO ---
console.log('');
log('🚀 Orquestrador v2.0 iniciado.');
fs.ensureDirSync(path.join(__dirname, '.tmp'));
mainMenu();
