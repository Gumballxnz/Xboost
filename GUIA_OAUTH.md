
# 🔐 Guia de Configuração: Login com Google e GitHub

Para que o login funcione no seu XBoost (Tanto local quanto em produção), você precisa criar "Aplicativos" no Google e no GitHub.

## 1. GitHub OAuth
1. Acesse: [GitHub Developer Settings](https://github.com/settings/developers)
2. Clique em **New OAuth App**.
3. Preencha:
   - **Application Name**: XBoost SaaS
   - **Homepage URL**: `http://localhost:3002` (Local) ou `https://seu-site.com` (Prod)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback` (Local) ou `https://seu-api.com/api/auth/github/callback` (Prod)
4. Clique em **Register application**.
5. Copie o **Client ID**.
6. Clique em **Generate a new client secret** e copie o **Client Secret**.
7. Cole no seu arquivo `.env`:
   ```env
   GITHUB_CLIENT_ID=seu_id_aqui
   GITHUB_CLIENT_SECRET=seu_secret_aqui
   ```

## 2. Google OAuth
1. Acesse: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crie um novo projeto (ex: XBoost).
3. Vá em **Credentials** > **Create Credentials** > **OAuth client ID**.
4. Configure a "Consent Screen" (interno/externo - escolha Externo para testes).
5. Em **Application type**, escolha **Web application**.
6. Preencha:
   - **Authorized JavaScript origins**: `http://localhost:3002`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/google/callback`
7. Copie o **Client ID** e **Client Secret**.
8. Cole no seu arquivo `.env`:
   ```env
   GOOGLE_CLIENT_ID=seu_id_aqui
   GOOGLE_CLIENT_SECRET=seu_secret_aqui
   ```

## 🚀 Dica de Deploy
Quando você fizer o deploy (subir o site), você precisará **adicionar as URLs de produção** nesses mesmos aplicativos.
- No GitHub, você pode atualizar as URLs.
- No Google, você pode adicionar novas URIs na lista.

---

### Testando
Após salvar o `.env`, reinicie seu servidor (`docker compose down && docker compose up -d`).
O botão de login deverá funcionar!
