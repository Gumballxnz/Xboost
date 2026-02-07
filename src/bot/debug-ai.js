
// Importa o OpenAI SDK (o Deepseek é compatível)
import OpenAI from 'openai';
import fs from 'fs-extra';
import colors from 'colors';

const DEEPSEEK_API_KEY = 'sk-b3d4bee424e8409eafc9dd07cfa3b57b'; // Sua Key

const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: DEEPSEEK_API_KEY
});

export async function analyzeError(htmlContent, errorMessage, context) {
    if (!htmlContent) return;

    console.log(`\n🧠 Deepseek AI: Analisando erro de ${context}...`.magenta.bold);

    try {
        // Limita o HTML para não estourar tokens e focar no body
        let cleanHtml = htmlContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
            .substring(0, 15000); // Primeiros 15k caracteres

        const completion = await client.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: "Você é um especialista em automação e debugging de Puppeteer/Selenium. Sua tarefa é analisar o HTML de uma página onde um bot falhou e identificar a causa provável."
                },
                {
                    role: "user",
                    content: `
                    O bot falhou com o erro: "${errorMessage}".
                    
                     Aqui está o HTML da página no momento do erro:
                    \`\`\`html
                    ${cleanHtml}
                    \`\`\`
                    
                    Analise o HTML e me diga:
                    1. O que está na tela? (Login, Captcha, Bloqueio, Erro 404?)
                    2. Por que o seletor falhou?
                    3. Sugira uma correção simples.
                    Responda em Português do Brasil, de forma resumida.`
                }
            ]
        });

        const analysis = completion.choices[0].message.content;

        console.log("\n🔎 DIAGNÓSTICO DEEPSEEK:".yellow.bold);
        console.log(analysis.cyan);

        // Salva diagnóstico
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.writeFileSync(`./logs/AI_DIAGNOSIS_${context}_${timestamp}.txt`, analysis);

    } catch (e) {
        console.log(`❌ Falha na análise de IA: ${e.message}`.red);
    }
}
