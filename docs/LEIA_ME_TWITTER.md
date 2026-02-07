# 🐦 Bot Twitter Multi-Contas (Novo Sistema)

Este é o novo sistema de automação para Twitter, focado em **criação e rotação de contas** para evitar bloqueios.

## 🚀 Como Iniciar

Basta clicar em **`INICIAR_TWITTER.bat`**.
Isso abrirá o **Gerenciador**, onde você pode escolher:

1.  🤖 **Criar Nova Conta** (Creator)
2.  ♻️ **Iniciar Rotação** (Commenter)

---

## 🛠️ Configuração (`config.js`)

Se você precisar mudar a senha padrão ou o email do Gmail, edite o arquivo `config.js`:

```javascript
export const GMAIL_USER = 'arianablake899@gmail.com';
export const GMAIL_PASS = 'Roman-700'; // Senha de App do Gmail
export const TWITTER_PASS = 'Roman700'; // Senha padrão das contas Twitter
```

## 🤖 1. Bot Criador (`creator.js`)

Este bot cria contas automaticamente usando a estratégia de Alias (+1, +2...).
*   **Captcha**: Ele VAI pausar quando aparecer o Captcha. **Você deve resolver o captcha na janela que abrir**. Assim que você terminar, o bot continua sozinho.
*   **Código de Email**: O bot acessa seu Gmail automaticamente e pega o código. **Não precisa digitar nada.**

## ♻️ 2. Bot Rotator (`rotator.js`)

Este bot lê as contas do banco de dados (`accounts_db.json`) e começa a comentar.
*   **Mecanismo Anti-Ban**: Se uma conta for limitada, ele faz logout e entra na próxima conta da lista imediatamente.
*   **Senha**: Ele usa a senha salva no banco de dados (`Roman700`). Não usa mais cookies.

## 📁 Estrutura de Arquivos

*   `manager.js`: O menu principal.
*   `creator.js`: Script que cria as contas.
*   `rotator.js`: Script que comenta e troca de conta.
*   `accounts_db.json`: Onde ficam salvas as contas criadas (Login/Senha).
*   `config.js`: Configurações gerais.
