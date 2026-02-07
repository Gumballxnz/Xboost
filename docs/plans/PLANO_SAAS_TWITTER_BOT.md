# PLANO SaaS: Twitter Bot Platform

> Arquitetura completa para transformar o bot de automação Twitter em uma plataforma paga multi-tenant.

---

## 1. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Login   │ │Dashboard │ │ Campaign │ │ Billing  │ │  Admin   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND API (Node.js/Express)                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ Auth API   │ │Campaign API│ │Payment API │ │ Admin API  │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
│                          │               │                                  │
│                          ▼               ▼                                  │
│  ┌────────────────────────────┐ ┌────────────────────────────┐             │
│  │     PostgreSQL (Supabase)  │ │    Redis (Upstash)         │             │
│  │  - Users, Campaigns        │ │  - Task Queue (BullMQ)     │             │
│  │  - Transactions, Plans     │ │  - Session Cache           │             │
│  └────────────────────────────┘ └─────────────┬──────────────┘             │
└───────────────────────────────────────────────┼─────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BOT WORKER SERVICE                                │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                        Queue Consumer (BullMQ)                      │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │    │
│  │  │ Job: COMMENT │ │Job: VALIDATE │ │Job: CREATE   │                │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Existing Bot (manager.js)                        │    │
│  │        rotator.js │ create_account.js │ humanize_browser.js         │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │    Stripe    │ │   Webshare   │ │   Twitter    │ │   SendGrid   │       │
│  │  (Payments)  │ │   (Proxies)  │ │   (Target)   │ │   (Emails)   │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| **Frontend** | Next.js 14 + Tailwind | SSR, auth integrado, deploy fácil |
| **Backend** | Node.js + Express | Mesma linguagem do bot existente |
| **Database** | PostgreSQL (Supabase) | Gratuito até 500MB, auth built-in |
| **Queue** | Redis + BullMQ | Robusto, UI dashboard incluída |
| **Payments** | Stripe | Global, webhooks confiáveis |
| **Hosting** | Vercel + Railway | Deploy simples, auto-scaling |

---

## 2. Modelo de Dados

### 2.1 Diagrama ER

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│     USERS      │     │   CAMPAIGNS    │     │   COMMENTS     │
├────────────────┤     ├────────────────┤     ├────────────────┤
│ id (PK)        │────▶│ id (PK)        │────▶│ id (PK)        │
│ email          │     │ user_id (FK)   │     │ campaign_id(FK)│
│ password_hash  │     │ post_url       │     │ bot_account_id │
│ name           │     │ total_comments │     │ content        │
│ credits        │     │ completed      │     │ status         │
│ plan           │     │ status         │     │ created_at     │
│ stripe_id      │     │ created_at     │     └────────────────┘
│ created_at     │     └────────────────┘
└────────────────┘
         │
         │     ┌────────────────┐     ┌────────────────┐
         │     │  TRANSACTIONS  │     │  BOT_ACCOUNTS  │
         │     ├────────────────┤     ├────────────────┤
         └────▶│ id (PK)        │     │ id (PK)        │
               │ user_id (FK)   │     │ email          │
               │ amount         │     │ username       │
               │ credits        │     │ proxy          │
               │ stripe_id      │     │ status         │
               │ status         │     │ health_score   │
               │ created_at     │     │ last_used      │
               └────────────────┘     └────────────────┘
```

### 2.2 Schema SQL (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    credits INTEGER DEFAULT 5, -- Teste grátis
    plan VARCHAR(20) DEFAULT 'free', -- free, basic, pro
    stripe_customer_id VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    post_url VARCHAR(500) NOT NULL,
    total_comments INTEGER NOT NULL,
    completed_comments INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bot Accounts (contas do bot)
CREATE TABLE bot_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    proxy VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active', -- active, limited, suspended
    health_score INTEGER DEFAULT 100,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount_cents INTEGER NOT NULL,
    credits_purchased INTEGER NOT NULL,
    stripe_payment_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Fluxo de Trabalho do Usuário

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Cadastro │──▶│5 Créditos│──▶│ Dashboard│──▶│  Criar   │──▶│Acompanhar│
│  /Login  │   │  Grátis  │   │          │   │ Campanha │   │ Progresso│
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │ Créditos = 0 │
                            │   Comprar    │──▶ Stripe Checkout
                            └──────────────┘
```

### Fluxo Detalhado

1. **Cadastro** → Usuário cria conta (email/senha)
2. **Bônus** → Recebe 5 créditos grátis automaticamente
3. **Dashboard** → Vê saldo, campanhas anteriores
4. **Nova Campanha**:
   - Cola URL do post Twitter
   - Escolhe quantidade de comentários
   - Sistema verifica se tem créditos
   - Campanha entra na fila
5. **Execução** → Bot consome fila e executa
6. **Relatório** → Usuário vê status em tempo real
7. **Recompra** → Quando créditos acabam, vai para checkout

---

## 4. Frontend (Páginas)

### 4.1 Estrutura de Páginas

```
/                    → Landing page (marketing)
/login               → Login
/register            → Cadastro
/dashboard           → Painel principal do usuário
/dashboard/campaign/new  → Criar nova campanha
/dashboard/campaign/:id  → Detalhes da campanha
/dashboard/billing   → Comprar créditos
/dashboard/history   → Histórico de campanhas
/admin               → Painel administrativo (protegido)
/admin/users         → Gerenciar usuários
/admin/campaigns     → Ver todas campanhas
/admin/bot           → Status do bot
```

### 4.2 Wireframe - Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  🐦 TwitterBoost           [Créditos: 47]    [Comprar] [Sair]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  💰 Seus Créditos: 47                                    │   │
│  │  [+ Comprar Mais Créditos]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🚀 NOVA CAMPANHA                                        │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ URL do Post: https://x.com/user/status/123...       │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │  Quantidade: [10 ▼] comentários                          │   │
│  │  Custo: 10 créditos                                      │   │
│  │  [INICIAR CAMPANHA]                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📋 CAMPANHAS RECENTES                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ #1234 │ x.com/post/... │ 10/10 ✅ │ Completo │ 2h atrás  │ │
│  │ #1233 │ x.com/post/... │ 5/8  🔄 │ Rodando  │ 30m atrás │ │
│  │ #1232 │ x.com/post/... │ 0/5  ❌ │ Falhou   │ 1d atrás  │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Backend API

### 5.1 Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| **Auth** |||
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/auth/me` | Dados do usuário logado |
| **Campaigns** |||
| POST | `/api/campaigns` | Criar campanha |
| GET | `/api/campaigns` | Listar campanhas do usuário |
| GET | `/api/campaigns/:id` | Detalhes de uma campanha |
| **Billing** |||
| POST | `/api/billing/checkout` | Criar sessão Stripe |
| POST | `/api/billing/webhook` | Webhook do Stripe |
| GET | `/api/billing/transactions` | Histórico de compras |
| **Admin** |||
| GET | `/api/admin/users` | Listar todos usuários |
| GET | `/api/admin/campaigns` | Listar todas campanhas |
| GET | `/api/admin/bot/status` | Status do bot |
| PATCH | `/api/admin/users/:id/credits` | Ajustar créditos |

### 5.2 Exemplo: Criar Campanha

```javascript
// POST /api/campaigns
app.post('/api/campaigns', authMiddleware, async (req, res) => {
    const { postUrl, commentsCount } = req.body;
    const userId = req.user.id;
    
    // 1. Verificar créditos
    const user = await db.users.findById(userId);
    if (user.credits < commentsCount) {
        return res.status(402).json({ error: 'Créditos insuficientes' });
    }
    
    // 2. Debitar créditos
    await db.users.update(userId, { 
        credits: user.credits - commentsCount 
    });
    
    // 3. Criar campanha
    const campaign = await db.campaigns.create({
        user_id: userId,
        post_url: postUrl,
        total_comments: commentsCount,
        status: 'pending'
    });
    
    // 4. Adicionar à fila
    await commentQueue.add('comment-job', {
        campaignId: campaign.id,
        postUrl,
        count: commentsCount
    });
    
    res.json({ campaign });
});
```

---

## 6. Integração com Bot Existente

### 6.1 Worker de Fila (queue-worker.js)

```javascript
import { Worker } from 'bullmq';
import { spawn } from 'child_process';
import db from './database.js';

const worker = new Worker('comments', async (job) => {
    const { campaignId, postUrl, count } = job.data;
    
    console.log(`🚀 Iniciando campanha ${campaignId}: ${count} comentários`);
    
    // Atualizar status
    await db.campaigns.update(campaignId, { status: 'running' });
    
    for (let i = 0; i < count; i++) {
        try {
            // Chamar o rotator existente
            await runBot('rotator.js', [postUrl]);
            
            // Atualizar progresso
            await db.campaigns.increment(campaignId, 'completed_comments');
            
            // Reportar progresso
            job.updateProgress((i + 1) / count * 100);
            
            // Delay entre comentários
            await sleep(30000 + Math.random() * 60000);
            
        } catch (error) {
            console.error(`Erro no comentário ${i + 1}:`, error);
        }
    }
    
    await db.campaigns.update(campaignId, { status: 'completed' });
    console.log(`✅ Campanha ${campaignId} finalizada!`);
    
}, { connection: redis });

function runBot(script, args) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [`execution/${script}`, ...args]);
        child.on('close', (code) => code === 0 ? resolve() : reject());
    });
}
```

### 6.2 Adaptação do rotator.js

Adicionar modo "single" para executar apenas 1 comentário:

```javascript
// No rotator.js, adicionar:
const singleMode = process.argv.includes('--single');

if (singleMode) {
    // Pegar apenas 1 conta ativa
    const account = activeAccounts[0];
    await commentOnPost(account, process.argv[2]);
    process.exit(0);
}
```

---

## 7. Sistema de Pagamento (Stripe)

### 7.1 Fluxo de Checkout

```
Usuário clica "Comprar"
        │
        ▼
POST /api/billing/checkout
        │
        ▼
Stripe cria Checkout Session
        │
        ▼
Redirect para Stripe
        │
        ▼
Pagamento aprovado
        │
        ▼
Stripe envia Webhook
        │
        ▼
POST /api/billing/webhook
        │
        ▼
Creditar usuário
```

### 7.2 Implementação

```javascript
// POST /api/billing/checkout
app.post('/api/billing/checkout', authMiddleware, async (req, res) => {
    const { packageId } = req.body; // '50credits', '100credits', etc.
    
    const packages = {
        '50credits': { price: 999, credits: 50 },   // $9.99
        '100credits': { price: 1799, credits: 100 }, // $17.99
        '500credits': { price: 4999, credits: 500 }, // $49.99
    };
    
    const pkg = packages[packageId];
    
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: `${pkg.credits} Créditos` },
                unit_amount: pkg.price,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/billing`,
        metadata: {
            userId: req.user.id,
            credits: pkg.credits
        }
    });
    
    res.json({ url: session.url });
});

// POST /api/billing/webhook
app.post('/api/billing/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, credits } = session.metadata;
        
        // Creditar usuário
        await db.users.increment(userId, 'credits', parseInt(credits));
        
        // Registrar transação
        await db.transactions.create({
            user_id: userId,
            amount_cents: session.amount_total,
            credits_purchased: parseInt(credits),
            stripe_payment_id: session.payment_intent,
            status: 'completed'
        });
    }
    
    res.sendStatus(200);
});
```

---

## 8. Painel Administrativo

### 8.1 Funcionalidades

| Página | Funcionalidade |
|--------|----------------|
| `/admin` | Dashboard com métricas gerais |
| `/admin/users` | Lista usuários, ajusta créditos |
| `/admin/campaigns` | Todas campanhas, filtros por status |
| `/admin/bot` | Health das contas, status proxies |
| `/admin/settings` | Preços, limites, configurações |

### 8.2 Métricas do Dashboard Admin

```
┌─────────────────────────────────────────────────────────────┐
│  📊 PAINEL ADMIN                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │  Usuários │ │ Campanhas │ │ Comentários│ │  Receita  │   │
│  │    247    │ │    892    │ │   12,450   │ │  $2,340   │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                             │
│  🤖 STATUS DO BOT                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Contas Ativas: 8/9 (89%)                            │   │
│  │ Proxies OK: 9/9 (100%)                              │   │
│  │ Fila: 3 jobs aguardando                             │   │
│  │ Última execução: há 2 minutos                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Segurança

### 9.1 Checklist de Segurança

- [x] **HTTPS** obrigatório (Vercel/Railway automático)
- [x] **bcrypt** para hash de senhas (work factor 12)
- [x] **JWT** com expiração curta (1h) + refresh token
- [x] **Rate limiting** por IP e por usuário
- [x] **Helmet.js** para headers de segurança
- [x] **Input validation** com Zod/Joi
- [x] **SQL injection** prevenido via ORM (Prisma/Drizzle)
- [x] **CORS** restrito ao domínio frontend
- [x] **Webhook signature** validada (Stripe)
- [x] **Admin routes** protegidas por role

### 9.2 Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

// Limite global
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100 // 100 requests
});

// Limite para criação de campanha
const campaignLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10 // 10 campanhas por hora
});

app.use(globalLimiter);
app.post('/api/campaigns', campaignLimiter, ...);
```

---

## 10. Roadmap de Implementação

### Fase 1: MVP (2 semanas)
- [ ] Setup projeto Next.js + API
- [ ] Auth (registro, login, JWT)
- [ ] Dashboard básico
- [ ] Criar campanha (sem pagamento)
- [ ] Integrar fila Redis + Worker
- [ ] Teste grátis (5 créditos)

### Fase 2: Pagamentos (1 semana)
- [ ] Integração Stripe Checkout
- [ ] Webhook de pagamento
- [ ] Página de billing
- [ ] Histórico de transações

### Fase 3: Admin (1 semana)
- [ ] Painel administrativo
- [ ] Gerenciar usuários
- [ ] Métricas e relatórios
- [ ] Ajustar créditos manualmente

### Fase 4: Polish (1 semana)
- [ ] Emails transacionais (SendGrid)
- [ ] Landing page marketing
- [ ] Planos recorrentes (subscription)
- [ ] Testes automatizados

---

## 11. Código Inicial (Boilerplate)

### 11.1 Estrutura do Projeto

```
saas-twitter-bot/
├── frontend/                 # Next.js
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── campaign/
│   │   │   └── billing/
│   │   └── admin/
│   ├── components/
│   └── lib/
├── backend/                  # Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── index.js
│   └── package.json
├── worker/                   # Bot Worker
│   ├── queue-worker.js
│   └── package.json
└── bot/                      # Bot existente (Twitter_Bot/)
    ├── execution/
    ├── manager.js
    └── ...
```

### 11.2 docker-compose.yml

```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
      - STRIPE_SECRET_KEY=sk_...
    depends_on:
      - redis
  
  worker:
    build: ./worker
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://...
    volumes:
      - ./bot:/app/bot
    depends_on:
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

---

## 12. Custos Estimados (Mensal)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel (Frontend) | Hobby | $0 |
| Railway (Backend + Worker) | Starter | ~$5 |
| Supabase (PostgreSQL) | Free | $0 |
| Upstash (Redis) | Free | $0 |
| Webshare (Proxies) | 10 proxies | ~$10 |
| **Total MVP** | | **~$15/mês** |

---

> **Próximo Passo:** Aprovar este plano e iniciar a Fase 1 (MVP)
