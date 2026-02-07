
const { Worker } = require('bullmq');
const { exec } = require('child_process');
const path = require('path');
const connection = require('../config/redis');

// Caminho para o manager.js na raiz do projeto
const MANAGER_PATH = path.resolve(__dirname, '../../../manager.js');

const worker = new Worker('campaigns', async (job) => {
    console.log(`🔨 Processando Campanha #${job.id}: ${job.data.postUrl}`);

    // Simulação de processamento ou chamada real ao manager.js
    // A chamada real depende de como o manager.js aceita argumentos CLI
    // Exemplo: node manager.js --url "..." --count 50

    return new Promise((resolve, reject) => {
        const command = `node "${MANAGER_PATH}" --url "${job.data.postUrl}" --count ${job.data.commentCount || 5} --mode execution`;

        console.log(`🚀 Executing: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Erro na execução: ${error.message}`);
                // Em produção, talvez queiramos rejeitar apenas se for erro fatal
                // reject(error); 
                // Mas o manager.js pode falhar em uma conta e sucesso em outras.
                // Logamos o erro e resolvemos com status 'partial_failure' ou similar.
                reject(new Error(stderr || error.message));
                return;
            }

            console.log(`Manager Output: ${stdout}`);
            if (stderr) console.error(`Manager Stderr: ${stderr}`);

            resolve({ status: 'completed', output: stdout });
        });
    });
}, {
    connection,
    concurrency: 5 // Configurar conforme capacidade do servidor
});

worker.on('completed', (job) => {
    console.log(`✅ Campanha #${job.id} concluída com sucesso!`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Campanha #${job.id} falhou: ${err.message}`);
});

console.log('👷 Worker de Campanhas iniciado e aguardando jobs...');

module.exports = worker;
