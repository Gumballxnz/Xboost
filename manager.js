// =====================================================
// MANAGER.JS - BRIDGE (SaaS -> Orchestrator)
// =====================================================
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORCHESTRATOR_PATH = path.join(__dirname, 'src/bot/orchestrator.js');

// Parse Arguments from CLI
const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const countIndex = args.indexOf('--count');
const modeIndex = args.indexOf('--mode');

const target = urlIndex !== -1 ? args[urlIndex + 1] : null;
const count = countIndex !== -1 ? args[countIndex + 1] : 10;
const mode = modeIndex !== -1 ? args[modeIndex + 1] : 'execution';

console.log(`[MANAGER] Bridge iniciado. Target: ${target}, Count: ${count}, Mode: ${mode}`);

if (!target) {
    console.error('[MANAGER] Erro: URL alvo não fornecida (--url)');
    process.exit(1);
}

// Map SaaS commands to Orchestrator Headless commands
// Ex: node orchestrator.js --headless --command ADD_TASK --type COMMENT --target "..." --count 10 --execute

const orchestratorArgs = [
    ORCHESTRATOR_PATH,
    '--headless',
    '--command', 'ADD_TASK',
    '--type', 'COMMENT',
    '--target', target,
    '--count', count.toString(),
    '--execute' // Run immediately
];

const child = spawn('node', orchestratorArgs, {
    stdio: 'inherit',
    cwd: __dirname
});

child.on('close', (code) => {
    console.log(`[MANAGER] Orchestrator finalizado com código ${code}`);
    process.exit(code);
});

child.on('error', (err) => {
    console.error(`[MANAGER] Erro ao iniciar Orchestrator: ${err.message}`);
    process.exit(1);
});
