# PLANO DE OTIMIZAÇÃO: XBoost Enterprise (SaaS)

> **Missão:** Transformar o protótipo funcional em uma plataforma SaaS conversora, segura e escalável.
> **Status:** Planejamento (Fase 3)
> **Data:** 2026-02-07

---

## 📋 Backlog de Sprints

### Sprint 1: Experiência do Usuário (UX/UI & Copy)
**Foco:** Conversão e Confiança (E-E-A-T)
- [ ] **Landing Page**: Reescrita completa do copy (PAS), implementação da seção "Como Garantimos Sua Segurança".
- [ ] **Design System**: Definição da paleta premium (Azul Profundo, Verde Sucesso, Laranja Alerta).
- [ ] **Dashboard V2**: Implementar layout mobile-first com Sidebar colapsável.
- [ ] **Nova Campanha**: Criar fluxo em etapas (Stepper) com preview em tempo real.

### Sprint 2: Hardening do Backend (API & Segurança)
**Foco:** Robustez e Proteção
- [ ] **Middleware de Segurança**: Rate Limiting (Redis), Helmet, Sanitização.
- [ ] **Autenticação Avançada**: JWT + Refresh Tokens (HttpOnly).
- [ ] **RBAC**: Implementar papéis (User, Admin, API-Key).
- [ ] **API Pública**: Criar endpoint `/v1/external/campaigns` com documentação Swagger.

### Sprint 3: Automação Resiliente (Python & DevOps)
**Foco:** Estabilidade e Manutenibilidade
- [ ] **Classe Base Python**: Padronizar todos os scripts com logging JSON e retry.
- [ ] **Circuit Breaker**: Implementar lógica de falha inteligente para proxies.
- [ ] **Health Checks**: Script de monitoramento 24/7.
- [ ] **Pipeline de Deploy**: Scripts `deploy.sh` e `rollback.sh`.

---

## 🎨 Fase 1: Otimização UX/UI & Copy

### 1.1 Copywriting Persuasivo (SEO & Gatilhos)

**Headline Principal (PAS):**
> **Problema:** "Cansado de perder alcance no Twitter? Seus posts desaparecem no feed?"
> **Agitação:** "O algoritmo ignora contas sem engajamento real, tornando seu esforço invisível."
> **Solução:** "O XBoost garante sua marca no topo. Engajamento humanizado, indetectável e amado pelo algoritmo."

**Benefícios vs. Funcionalidades:**
- ❌ *Proxies Premium* → ✅ **Invisível para o Twitter**: "Cada ação parte de um IP residencial único. Rastreamento impossível."
- ❌ *Automação de Comentários* → ✅ **Domine a Conversa**: "Seus comentários sempre em destaque, gerando autoridade instantânea."

**Gatilhos de Confiança:**
- 🔒 **Segurança Blindada**: "Sem acesso à sua senha. Criptografia ponta-a-ponta."
- 📉 **Uptime Garantido**: "SLA de 99.9%. Seu crescimento não para."

### 1.2 Dashboard Premium (Especificação UI)

**Paleta de Cores (CSS Tokens):**
```css
:root {
  --color-primary: #0F172A; /* Azul Profundo (Confiança) */
  --color-accent: #3B82F6;  /* Azul Vibrante (Ação) */
  --color-success: #10B981; /* Verde (Status OK) */
  --color-warning: #F59E0B; /* Laranja (Alertas) */
  --color-bg: #F8FAFC;      /* Fundo Clean */
  --color-surface: #FFFFFF; /* Cards */
}
```

---

## 🛡️ Fase 2: Arquitetura Segura (Node.js API)

### 2.1 Middlewares de Segurança (Boilerplate)

**`src/api/middlewares/security.js`**
```javascript
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');

// Rate Limiter com Redis Store (Recomendado para prod)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});

module.exports = (app) => {
  app.use(helmet()); // Headers HTTP seguros
  app.use(xss());    // Sanitização contra XSS
  app.use('/api', limiter); // Aplica rate limit na API
};
```

---

## 🤖 Fase 3: Automação Python Robusta

### 3.1 Classe Base de Tarefa (Boilerplate)

**`src/core/base_task.py`**
```python
import logging
import json
import time
from abc import ABC, abstractmethod

class TwitterAutomationTask(ABC):
    def __init__(self, task_id, max_retries=3):
        self.task_id = task_id
        self.max_retries = max_retries
        self.logger = self._setup_logger()

    def _setup_logger(self):
        logger = logging.getLogger(f"Task-{self.task_id}")
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        return logger

    def run(self):
        """Template Method: Gerencia retries e erros"""
        attempts = 0
        while attempts < self.max_retries:
            try:
                self.logger.info(f"Iniciando tentativa {attempts + 1}")
                result = self.execute()
                self.logger.info("Tarefa concluída com sucesso")
                return result
            except Exception as e:
                attempts += 1
                self.logger.error(f"Erro na tentativa {attempts}: {str(e)}")
                time.sleep(2 ** attempts) # Backoff exponencial (2s, 4s, 8s)
        
        self.logger.critical("Falha definitiva na tarefa após todas as tentativas")
        return None

    @abstractmethod
    def execute(self):
        """Lógica específica da tarefa (implementar nas subclasses)"""
        pass
```

---

## 🚀 Fase 4: Deploy & DevOps

### 4.1 Script de Deploy (Boilerplate)

**`deploy/deploy.sh`**
```bash
#!/bin/bash
set -e # Para se houver erro

echo "🚀 Iniciando Deploy do XBoost..."

# 1. Pull do código
git pull origin main

# 2. Dependências
echo "📦 Instalando dependências..."
npm install --prefix ./src/saas/frontend
pip install -r requirements.txt

# 3. Testes de Segurança (Skill: vulnerability-scanner)
echo "🛡️ Executando verificação de segurança..."
npm audit --prefix ./src/saas/frontend
# python scripts/security_scan.py (se existir)

# 4. Restart Serviços
echo "🔄 Reiniciando serviços..."
pm2 restart xboost-api
sudo systemctl restart xboost-worker

echo "✅ Deploy concluído com sucesso!"
```

---

## 🔍 Checklist de Validação Final

- [ ] **UX**: O site carrega em < 2s (LCP)? O formulário funciona no celular?
- [ ] **API**: Tentativas de força bruta são bloqueadas? Chaves de API funcionam?
- [ ] **Bot**: O script se recupera se a internet cair (retry)?
- [ ] **Backup**: O dump do banco está sendo salvo externamente?

---

> **Próximo Passo Imediato**: Aprovar este plano e iniciar a **Sprint 1 (Landing Page & Copy)**.
