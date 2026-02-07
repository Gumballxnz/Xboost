# Diretiva: Comportamento Humano

> SOP para simular comportamento humano e evitar detecção.

---

## Princípios Fundamentais

1. **Nunca seja previsível** - Adicione aleatoriedade em TUDO.
2. **Respeite os limites humanos** - Ninguém digita 100 palavras/segundo.
3. **Tenha "personalidade"** - Cada conta deve ter padrões únicos.

---

## Delays Obrigatórios

| Ação | Delay Mínimo | Delay Máximo | Variância |
|------|--------------|--------------|-----------|
| Entre páginas | 2s | 5s | ±30% |
| Antes de digitar | 500ms | 1500ms | ±20% |
| Entre caracteres | 50ms | 150ms | ±50% |
| Antes de clicar | 200ms | 800ms | ±30% |
| Após ação crítica | 3s | 8s | ±40% |

---

## Curva de Atividade (Horários)

| Período | Intensidade | Notas |
|---------|-------------|-------|
| 00:00 - 06:00 | 🔴 ZERO | Bot "dorme" |
| 06:00 - 09:00 | 🟡 BAIXA | Acordando, poucos posts |
| 09:00 - 12:00 | 🟢 NORMAL | Atividade regular |
| 12:00 - 14:00 | 🟡 BAIXA | Pausa almoço |
| 14:00 - 18:00 | 🟢 NORMAL | Atividade regular |
| 18:00 - 22:00 | 🟢 ALTA | Pico de engajamento |
| 22:00 - 00:00 | 🟡 BAIXA | Preparando para dormir |

---

## Padrões de Digitação

### Velocidade por Tipo de Texto
- **Username/Email**: 80-120 WPM (conhecido, rápido)
- **Senha**: 60-100 WPM (digitação cuidadosa)
- **Comentários**: 40-80 WPM (pensando enquanto escreve)

### Comportamentos Humanos a Simular
- [x] Pausas aleatórias durante digitação
- [x] Ocasionalmente "hesitar" antes de tecla difícil
- [x] Mover mouse antes de clicar (não teleportar)
- [x] Scroll natural (não instantâneo)
- [ ] Erros de digitação ocasionais + backspace (avançado)

---

## Limites por Conta/Dia

| Ação | Limite Diário | Intervalo Mínimo |
|------|---------------|------------------|
| Comentários | 10-15 | 5-10 min |
| Likes | 30-50 | 1-3 min |
| Follows | 10-20 | 3-5 min |
| Retweets | 5-10 | 10-15 min |

> ⚠️ Contas novas (< 7 dias): Reduzir todos os limites em 70%

---

## Fingerprinting

Cada conta DEVE ter fingerprint único:
- User-Agent consistente
- Viewport consistente
- Timezone consistente
- Idioma consistente

**Regra:** Fingerprint é gerado na criação e NUNCA muda.

---

## Implementação

```javascript
// Exemplo de delay humanizado
async function humanDelay(baseMs) {
    const variance = 0.3; // ±30%
    const variation = baseMs * variance * (Math.random() - 0.5) * 2;
    await sleep(baseMs + variation);
}

// Exemplo de digitação humanizada
async function humanType(page, text) {
    for (const char of text) {
        await page.keyboard.type(char, { 
            delay: 50 + Math.random() * 100 
        });
        // 5% chance de pausa longa
        if (Math.random() < 0.05) {
            await humanDelay(300);
        }
    }
}
```
