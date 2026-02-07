import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const GMAIL_USER = 'arianablake899@gmail.com';
export const GMAIL_PASS = 'Roman-700'; // App Password or Main Password if allowed
export const TWITTER_PASS = 'Roman700'; // Senha fixa para novas contas

// Garante que o DB seja acessado sempre na raiz do projeto, independente de onde o script roda
export const ACCOUNTS_DB = path.join(__dirname, 'accounts_db.json');

// Palavras para evitar no Twitter (se for usar no futuro)
export const BLACKLIST_WORDS = ['ban', 'suspend'];
