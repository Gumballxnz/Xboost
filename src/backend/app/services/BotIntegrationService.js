import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import ResourceService from './ResourceService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../../../bot/execution/create_account.js');

class BotIntegrationService {
    async generateAccounts(count = 10) {
        console.log(`🤖 Iniciando geração de ${count} contas...`);
        const results = [];

        for (let i = 0; i < count; i++) {
            const fakeName = `BotUser_${Date.now()}_${i}`;
            const fakeEmail = `bot_${Date.now()}_${i}@example.com`;

            // 1. Register intent in DB
            await ResourceService.addAccount({
                username: fakeName,
                email: fakeEmail,
                status: 'creating',
                password_hash: 'pending' // Will be updated by script in real scenario
            });

            // 2. Spawn Script (Fire and Forget)
            this.runScript(fakeEmail, fakeName);

            results.push({ email: fakeEmail, status: 'initiated' });

            // Small delay to prevent instant ban blocking
            await new Promise(r => setTimeout(r, 2000));
        }

        return { message: `Iniciado processo para ${count} contas.`, accounts: results };
    }

    runScript(email, name) {
        const child = spawn('node', [SCRIPT_PATH, '--email', email, '--name', name], {
            stdio: 'inherit' // Pipe logs to main console
        });

        child.on('close', (code) => {
            console.log(`🤖 Bot process for ${email} exited with code ${code}`);
            // In a real app, we would parse stdout to see if it succeeded and update DB status
            // For now, we assume if code 0, it's "created" (simulated)
            if (code === 0) {
                // Update DB status to 'ready' (Mock update)
                // In reality, the python/js script should update the DB directly upon success
            }
        });

        child.on('error', (err) => {
            console.error(`❌ Failed to start subprocess for ${email}:`, err);
        });
    }
}

export default new BotIntegrationService();
