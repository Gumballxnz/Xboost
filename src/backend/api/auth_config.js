
// 🔐 Credenciais OAuth - PREENCHER EM PRODUÇÃO
// Obtenha estas chaves em:
// GitHub: https://github.com/settings/developers
// Google: https://console.cloud.google.com/apis/credentials

module.exports = {
    github: {
        clientID: process.env.GITHUB_CLIENT_ID || 'SEU_GITHUB_CLIENT_ID',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || 'SEU_GITHUB_CLIENT_SECRET'
    },
    google: {
        clientID: process.env.GOOGLE_CLIENT_ID || 'SEU_GOOGLE_CLIENT_ID',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'SEU_GOOGLE_CLIENT_SECRET'
    }
};
