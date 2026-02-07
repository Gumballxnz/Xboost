# PLANO DE IMPLEMENTAÇÃO: XBoost SaaS Evolution 🚀

> **Documento Mestre de Arquitetura & Execução**
> **Autor:** Antigravity (Arquiteto-Chefe)
> **Data:** 2026-02-07
> **Status:** Aprovado para Execução

---

## 📋 Parte A: Plano de Ação Priorizado (Sprints)

### 📌 Sprint 1: Fundação de Automação (CAPTCHA & E-mail)
**Objetivo:** Resolver os bloqueadores críticos de automação de contas sem custos recorrentes de terceiros.

1.  **Módulo `captcha_solver.py` (Híbrido)**
    *   [ ] Implementar **Detecção de Tipo** (Imagem vs Áudio vs Texto).
    *   [ ] Integrar **Whisper (OpenAI/CPP)** para resolução de Áudio (ASR).
    *   [ ] Criar Pipeline de **Classificação de Imagens** (YOLOv8 ou MobileNetV2 treinado).
    *   [ ] Desenvolver **Dashboard de Fallback Web** (Flask/FastAPI simples) para intervenção humana quando a IA falhar.
    *   [ ] Implementar **Cache de Soluções** (Hash da imagem -> Solução).

2.  **Módulo `email_verification_client.py`**
    *   [ ] Implementar cliente **IMAP com OAuth2** (Foco: Gmail/Outlook).
    *   [ ] Criar lógica de **Polling Inteligente** (Timeout + Backoff).
    *   [ ] Desenvolver **Parser de Regex** robusto para extrair códigos (6-8 dígitos) de HTML/Texto.
    *   [ ] Integrar criptografia de credenciais (`.env` seguro).

### 📌 Sprint 2: Core do SaaS (API & Filas)
**Objetivo:** Construir o "cérebro" do sistema que gerencia pedidos e clientes.

1.  **API Node.js (`src/backend`)**
    *   [ ] Configurar **Express + Passport.js** (JWT + OAuth Google/GitHub).
    *   [ ] Implementar **Rate Limiting** por plano (Redis-based).
    *   [ ] Criar Schema de Banco de Dados (Supabase/PostgreSQL) para `Users`, `Campaigns`, `Credits`.
    *   [ ] Desenvolver Endpoint `POST /api/v1/campaigns` com validação Zod.

2.  **Sistema de Filas (BullMQ)**
    *   [ ] Configurar **Redis** para gestão de Jobs.
    *   [ ] Criar Queue `campaign-processing`.
    *   [ ] Implementar **Worker** que consome a fila e chama o `manager.js`.

### 📌 Sprint 3: Experiência do Cliente (Frontend Premium)
**Objetivo:** Interface profissional para venda e gestão.

1.  **Dashboard React/Next.js**
    *   [ ] Criar Layout **Mobile-First** (Sidebar colapsável, Dark Mode).
    *   [ ] Implementar **KPIs em Tempo Real** (SWR/React Query).
    *   [ ] Desenvolver **Formulário de Campanha** com Stepper e Preview.
    *   [ ] Página de **Billing** (Integração preliminar de pagamentos).

### 📌 Sprint 4: Infraestrutura & DevOps
**Objetivo:** Garantir que o sistema não caia e seja fácil de atualizar.

1.  **Deploy Pipeline**
    *   [ ] Scripts `deploy.sh` e `rollback.sh`.
    *   [ ] Configuração **Nginx Reverse Proxy** (SSL via Certbot).
    *   [ ] Setup **PM2** (Node) e **Systemd** (Python Workers).

2.  **Monitoramento**
    *   [ ] Script `health-check.py` (Monitora API, Redis, Workers).
    *   [ ] Painel Admin (`/admin/system`) com status de proxies e contas.

---

## 💻 Parte B: Código Boilerplate Crítico

### 1. Python Captcha Solver (Esqueleto)
**Arquivo:** `execution/captcha_solver.py`

```python
import sys
import json
import logging
# import whisper  # Para áudio
# from tensorflow.keras.models import load_model # Para imagem

class CaptchaSolver:
    def __init__(self, method='auto', fallback_url='http://localhost:5000/fallback'):
        self.method = method
        self.fallback_url = fallback_url
        self.logger = logging.getLogger('CaptchaSolver')
        # self.audio_model = whisper.load_model("tiny")
        # self.image_model = load_model('models/captcha_model.h5')

    def solve(self, context_data):
        """
        Recebe dados do contexto (screenshot, audio_url, html).
        Retorna a solução (string).
        """
        captcha_type = self._detect_type(context_data)
        
        try:
            if captcha_type == 'audio':
                return self._solve_audio(context_data['audio_path'])
            elif captcha_type == 'image':
                return self._solve_image(context_data['image_path'])
            else:
                return self._request_fallback(context_data)
        except Exception as e:
            self.logger.error(f"AI Failure: {e}")
            return self._request_fallback(context_data)

    def _detect_type(self, data):
        # Lógica de detecção baseada no HTML/Seletores
        if 'audio_challenge' in data.get('html', ''):
            return 'audio'
        return 'image'

    def _solve_audio(self, audio_path):
        # Transcrição via Whisper
        # result = self.audio_model.transcribe(audio_path)
        # return result['text']
        return "12345" # Mock

    def _solve_image(self, image_path):
        # Classificação via CNN
        # prediction = self.image_model.predict(load_image(image_path))
        return "bus" # Mock

    def _request_fallback(self, data):
        # Envia para dashboard humano e aguarda resposta
        self.logger.warning("Requesting manual fallback...")
        # requests.post(self.fallback_url, json=data)
        # Lógica de polling até obter resposta
        return input("Manual Captcha Solution needed: ")

if __name__ == "__main__":
    # Interface CLI para integração com Node.js
    # python captcha_solver.py --context '{"html": "..."}'
    pass
```

### 2. Python Email Client (Esqueleto)
**Arquivo:** `execution/email_verification_client.py`

```python
import imaplib
import email
import re
import time
import os

class EmailClient:
    def __init__(self, provider='gmail'):
        self.username = os.getenv('EMAIL_USER')
        self.password = os.getenv('EMAIL_PASS')
        self.imap_server = 'imap.gmail.com' if provider == 'gmail' else 'imap-mail.outlook.com'

    def get_verification_code(self, sender_filter='twitter', timeout=300):
        start_time = time.time()
        
        with imaplib.IMAP4_SSL(self.imap_server) as mail:
            mail.login(self.username, self.password)
            mail.select('inbox')

            while (time.time() - start_time) < timeout:
                # Busca e-mails não lidos do remetente
                _, msg_ids = mail.search(None, f'(UNSEEN FROM "{sender_filter}")')
                
                if msg_ids[0]:
                    latest_id = msg_ids[0].split()[-1]
                    _, msg_data = mail.fetch(latest_id, '(RFC822)')
                    raw_email = msg_data[0][1]
                    email_msg = email.message_from_bytes(raw_email)
                    
                    code = self._extract_code(email_msg)
                    if code:
                        return code
                
                time.sleep(5) # Polling interval
        
        raise TimeoutError("Código de verificação não encontrado.")

    def _extract_code(self, email_msg):
        # Regex para código numérico de 6 a 8 dígitos
        # Simplificado para o exemplo
        body = ""
        if email_msg.is_multipart():
            for part in email_msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode()
        else:
            body = email_msg.get_payload(decode=True).decode()
            
        match = re.search(r'\b\d{6,8}\b', body)
        return match.group(0) if match else None
```

### 3. API Node.js Server (Boilerplate)
**Arquivo:** `src/backend/server.js`

```javascript
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const apiRoutes = require('./api/routes/index');

const app = express();

// 🛡️ Segurança
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// 🚦 Rate Limiting Global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use('/api', limiter);

// 🛣️ Rotas
app.use('/api/v1', apiRoutes);

// ⚠️ Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
```

### 4. Job Worker (Queue Processor)
**Arquivo:** `src/backend/queues/process-campaign.job.js`

```javascript
const { Worker } = require('bullmq');
const { exec } = require('child_process');
const redisConfig = require('../config/redis');

const worker = new Worker('campaigns', async (job) => {
    console.log(`🔨 Processando Campanha #${job.id}: ${job.data.postUrl}`);
    
    // 🔗 Integração com Camada 2 (Manager)
    // Chama o manager.js passando os dados da campanha
    return new Promise((resolve, reject) => {
        const command = `node manager.js --url "${job.data.postUrl}" --count ${job.data.commentCount}`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Erro na execução: ${error}`);
                reject(error);
                return;
            }
            console.log(`Manager Output: ${stdout}`);
            resolve(stdout);
        });
    });
}, { connection: redisConfig });

worker.on('completed', (job) => {
    console.log(`✅ Campanha #${job.id} concluída!`);
    // Notificar frontend via Webhook/Socket aqui em produção
});

console.log('👷 Worker de Campanhas iniciado.');
```

---

## ✅ Parte C: Checklist de Validação

### Captcha & E-mail
- [ ] O modelo identifica corretamente "ônibus" em 8/10 imagens?
- [ ] O Whisper transcreve 9/10 áudios corretamente em < 5s?
- [ ] O sistema de fallback abre a página manual quando a IA falha?
- [ ] O cliente de e-mail reconecta automaticamente se a conexão IMAP cair?

### SaaS API
- [ ] Tentar login com senha errada 5x bloqueia o IP (Rate Limit)?
- [ ] O endpoint de campanha rejeita URLs que não são do `x.com` ou `twitter.com`?
- [ ] O JWT expira corretamente após 24h?

### Infra
- [ ] O script `deploy.sh` executa do zero sem erro em um Ubuntu limpo?
- [ ] Os logs do PM2 persistem após reinício?

---

## 🏗️ Parte D: Recomendações de Infraestrutura

1.  **VPS (Custo-Benefício)**: DigitalOcean Droplet ou Hetzner Cloud.
    *   **Spec Mínima**: 2GB RAM / 1 vCPU (Para rodar Node + Python + Redis leve).
    *   **OS**: Ubuntu 22.04 LTS.

2.  **Proxy Provider**: Smartproxy ou Bright Data (Residencial Rotativo). Essencial para evitar bans.

3.  **Domínio & E-mail**:
    *   Cloudflare para DNS (Proteção DDoS gratuita).
    *   Amazon SES ou Postmark para e-mails transacionais do SaaS (boas-vindas, redefinição de senha).

4.  **Banco de Dados**:
    *   Supabase (Gerenciado) para começar rápido (Postgres + Auth).
    *   Redis local no VPS para filas e cache.
