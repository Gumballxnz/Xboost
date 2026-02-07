# Diretiva: Engajamento (Comentários)

> SOP para rotação de comentários em posts.

---

## Objetivo

Simular engajamento orgânico em posts específicos usando múltiplas contas.

---

## Fluxo de Execução

```
1. Receber URL do post alvo
2. Selecionar conta ATIVA com proxy funcional
3. Abrir navegador com Stealth + Proxy da conta
4. Login (Cookies primeiro, depois senha)
5. Navegar até o post
6. Digitar comentário (Spintax)
7. Enviar
8. Limpar cookies/cache
9. Próxima conta
```

---

## Spintax de Comentários

```
{Incrível|Muito bom|Top|Show|Excelente}! 
{Conteúdo|Post|Vídeo} {top demais|de qualidade|maravilhoso}.
{👏|🔥|💯|✅}
```

**Exemplos gerados:**
- "Incrível! Conteúdo top demais. 👏"
- "Top! Vídeo maravilhoso. 🔥"
- "Excelente! Post de qualidade. 💯"

---

## Limites por Sessão

| Tipo | Limite |
|------|--------|
| Comentários por conta | Max 3/hora |
| Intervalo entre comentários | 5-15 min |
| Contas por post | Max 5 (evitar flood) |

---

## Tratamento de Erros

| Erro | Ação |
|------|------|
| Login falhou | Marcar conta `LIMITED` |
| Captcha apareceu | Pular conta, tentar próxima |
| Post não encontrado | Abortar sessão |
| Rate limit | Pausar 30 min |

---

## Blacklist de Palavras

Nunca usar:
- bot, automated, script
- buy followers, free
- Emojis excessivos (> 3)
- Links externos
- Menções a outras contas

---

## Seletores Conhecidos

```javascript
// Caixa de resposta
const replyBox = 'div[role="textbox"][data-testid="tweetTextarea_0"]';

// Botão enviar
const sendButton = 'div[data-testid="tweetButtonInline"]';

// Fallback
const sendButtonAlt = 'div[data-testid="tweetButton"]';
```

---

## Métricas de Sucesso

- [ ] Comentário visível no post
- [ ] Sem notificação de spam
- [ ] Conta permanece ACTIVE
- [ ] Próximo login funciona
