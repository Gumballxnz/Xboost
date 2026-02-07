# Diretiva: Recuperação de Erros

> SOP para tratamento de falhas e auto-recuperação (Self-Annealing).

---

## Filosofia: Self-Annealing Loop

```
ERRO DETECTADO
     ↓
CAPTURAR CONTEXTO (screenshot, logs)
     ↓
TENTAR RECUPERAÇÃO AUTOMÁTICA
     ↓
FALHOU? → ESCALAR PARA HUMANO
     ↓
SUCESSO? → ATUALIZAR DIRETIVA (aprender)
```

---

## Classificação de Erros

| Tipo | Severidade | Ação Automática |
|------|------------|-----------------|
| **Timeout** | 🟡 Baixa | Retry com delay maior |
| **Selector não encontrado** | 🟡 Média | Tentar seletor alternativo |
| **Captcha** | 🟠 Alta | Pausar para humano |
| **Login negado** | 🔴 Crítica | Marcar conta suspensa |
| **IP bloqueado** | 🔴 Crítica | Quarentenar proxy |
| **Crash do navegador** | 🔴 Crítica | Reiniciar processo |

---

## Retry Policy

| Tentativa | Delay | Estratégia |
|-----------|-------|------------|
| 1ª | 5s | Repetir idêntico |
| 2ª | 15s | Trocar seletor |
| 3ª | 60s | Reiniciar navegador |
| 4ª | - | Falha permanente |

```javascript
// Exemplo de wrapper safeStep
async function safeStep(name, action, fallback = null) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`[${name}] Tentativa ${attempt}...`);
            return await action();
        } catch (error) {
            console.log(`[${name}] Erro: ${error.message}`);
            await screenshot(`error_${name}_attempt${attempt}`);
            
            if (attempt === 3) {
                if (fallback) return await fallback();
                throw error;
            }
            
            await sleep(5000 * attempt);
        }
    }
}
```

---

## Captura de Contexto

### O que salvar em caso de erro
1. Screenshot da tela atual
2. HTML da página (`page.content()`)
3. Console logs do navegador
4. URL atual
5. Timestamp

### Onde salvar
```
.tmp/
├── logs/
│   ├── error_2026-02-07_10-30-00.png
│   ├── error_2026-02-07_10-30-00.html
│   └── orchestrator.log
```

---

## Escalação para Humano

### Quando escalar
- [ ] Captcha apareceu
- [ ] 3 falhas consecutivas no mesmo passo
- [ ] Erro desconhecido (não mapeado)
- [ ] Conta requer verificação de telefone

### Como escalar
1. Pausar execução
2. Enviar notificação (se configurado)
3. Salvar estado para retomada
4. Aguardar input humano

---

## Atualização de Diretivas (Aprendizado)

Após resolver erro manualmente:
1. Documentar a solução
2. Adicionar seletor alternativo à lista
3. Atualizar timeout se necessário
4. Considerar adicionar fallback automático

**Exemplo de evolução:**
```markdown
## Seletores para Botão "Next"
- Principal: `span::-p-text(Next)`
- Fallback 1: `button[data-testid="next"]`
- Fallback 2: `//button[contains(text(),"Next")]`
- Último recurso: `page.keyboard.press('Enter')`
```
