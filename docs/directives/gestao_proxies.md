# Diretiva: Gestão de Proxies

> SOP para gerenciamento e rotação de proxies.

---

## Estrutura do Arquivo `proxies.txt`

```
# Formato: IP:PORT:USERNAME:PASSWORD
# Linhas começando com # são ignoradas

45.38.107.97:6014:user123:pass456
198.23.239.134:6540:user123:pass456
```

---

## Regras de Seleção

### Criação de Conta
1. Selecionar proxy do pool que **NÃO está em uso**.
2. Marcar proxy como "em uso" durante criação.
3. Após criação, **vincular proxy à conta** (Sticky Session).

### Login/Engajamento
1. **SEMPRE** usar o proxy que criou a conta.
2. Se proxy não funcionar: marcar conta como `IP_MISMATCH`.
3. **NUNCA** usar proxy diferente do original.

---

## Validação Periódica

| Frequência | Ação |
|------------|------|
| Diária | Ping básico em todos os proxies |
| Semanal | Teste completo via navegador |
| Pré-criação | Validar proxy específico antes de usar |

### Critérios de Proxy "Morto"
- [ ] Timeout > 10s
- [ ] 3 falhas consecutivas
- [ ] IP diferente do esperado (proxy comprometido)

---

## Rotação

### Cenários de Rotação
| Situação | Ação |
|----------|------|
| Proxy morto | Mover para `dead_proxies.txt` |
| Conta banida | Proxy vai para "quarentena" 24h |
| Sucesso de criação | Proxy fica "busy" para aquela conta |

---

## Sticky Session (CRÍTICO)

```javascript
// No accounts_db.json, salvar:
{
    "email": "user+1@gmail.com",
    "username": "bot_123",
    "proxy": "45.38.107.97:6014:user123:pass456", // COMPLETO
    "created_at": "2026-02-07T10:00:00Z"
}

// No rotator, SEMPRE usar:
const proxyToUse = account.proxy; // Nunca outro!
```

---

## Monitoramento

### Métricas a Rastrear
- Taxa de sucesso por proxy
- Tempo médio de resposta
- Contas criadas por proxy
- Bans por proxy (indicador de "queimado")

### Alerta Automático
- Proxy com > 50% falha → Quarentena
- Proxy com 100% ban → Remover permanentemente
