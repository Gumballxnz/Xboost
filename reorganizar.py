#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SCRIPT DE REORGANIZAÇÃO DO TWITTER_BOT
Execute dentro da pasta 'Twitter_Bot' para reorganizar automaticamente.
"""

import os
import shutil
import json
from pathlib import Path
import sys
from datetime import datetime

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# ================= CONFIGURAÇÃO =================
ESTRUTURA_ALVO = [
    'src/bot/core',
    'src/bot/workers', 
    'src/api/routes',
    'src/api/controllers',
    'src/api/middleware',
    'src/saas/frontend',
    'src/saas/admin',
    'scripts/account',
    'scripts/actions',
    'scripts/browser',
    'scripts/utils',
    'docs/directives',
    'docs/guides',
    'docs/plans',
    'config/environments',
    'storage/data',
    'storage/cookies',
    'storage/logs',
    'storage/temp',
    'tests/unit',
    'tests/integration',
    'tests/e2e',
    'deployments/docker',
    'deployments/aws',
    'deployments/oracle',
]

def criar_estrutura():
    """Cria toda a estrutura de pastas"""
    print("📁 Criando estrutura de pastas...")
    for pasta in ESTRUTURA_ALVO:
        Path(pasta).mkdir(parents=True, exist_ok=True)
        print(f"  ✅ {pasta}")
    print("✅ Estrutura criada!")

def mover_arquivo(origem, destino):
    """Move um arquivo com segurança"""
    try:
        if os.path.exists(origem):
            os.makedirs(os.path.dirname(destino), exist_ok=True)
            shutil.move(origem, destino)
            print(f"  📦 {origem} → {destino}")
            return True
    except Exception as e:
        print(f"  ⚠️ Erro: {origem}: {e}")
    return False

def mover_pasta(origem, destino):
    """Move conteúdo de uma pasta"""
    try:
        if os.path.exists(origem) and os.path.isdir(origem):
            os.makedirs(destino, exist_ok=True)
            for item in os.listdir(origem):
                src = os.path.join(origem, item)
                dst = os.path.join(destino, item)
                if os.path.isfile(src):
                    shutil.move(src, dst)
                    print(f"  📦 {src} → {dst}")
                elif os.path.isdir(src) and item not in ['node_modules', '.git', '__pycache__']:
                    shutil.move(src, dst)
                    print(f"  📁 {src} → {dst}")
            # Remover pasta vazia
            try:
                os.rmdir(origem)
            except:
                pass
            return True
    except Exception as e:
        print(f"  ⚠️ Erro: {origem}: {e}")
    return False

def fazer_backup():
    """Cria backup do projeto"""
    backup_name = f"../Twitter_Bot_BACKUP_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"💾 Criando backup em {backup_name}...")
    try:
        shutil.copytree('.', backup_name, 
                       ignore=shutil.ignore_patterns('node_modules', '.git', '__pycache__', '*.pyc'))
        print(f"✅ Backup criado!")
        return True
    except Exception as e:
        print(f"⚠️ Erro no backup: {e}")
        return False

def reorganizar():
    """Executa a reorganização"""
    print("\n" + "="*60)
    print("🔄 REORGANIZADOR DO TWITTER BOT")
    print("="*60 + "\n")
    
    # 1. Backup
    fazer_backup()
    
    # 2. Criar estrutura
    criar_estrutura()
    
    # 3. Mover arquivos
    print("\n🔄 Movendo arquivos...")
    
    # Documentação
    mover_pasta('directives', 'docs/directives')
    mover_arquivo('GUIA_SERVIDOR_AWS.md', 'docs/guides/GUIA_SERVIDOR_AWS.md')
    mover_arquivo('GUIA_SERVIDOR_ORACLE.md', 'docs/guides/GUIA_SERVIDOR_ORACLE.md')
    mover_arquivo('PLANO_DE_REFATORACAO_TWITTER_BOT.md', 'docs/plans/PLANO_DE_REFATORACAO_TWITTER_BOT.md')
    mover_arquivo('PLANO_SAAS_TWITTER_BOT.md', 'docs/plans/PLANO_SAAS_TWITTER_BOT.md')
    mover_arquivo('AGENTE.md', 'docs/AGENTE.md')
    mover_arquivo('LEIA_ME_TWITTER.md', 'docs/LEIA_ME_TWITTER.md')
    
    # Configurações
    mover_arquivo('proxies.txt', 'config/proxies.txt')
    mover_arquivo('accounts_db.json', 'config/twitter-accounts.json')
    
    # Scripts Python (execution/)
    if os.path.exists('execution'):
        for item in os.listdir('execution'):
            if item.endswith('.py'):
                src = f'execution/{item}'
                if 'comportamento' in item.lower():
                    dst = 'scripts/utils/human-behavior.py'
                elif 'proxy' in item.lower():
                    dst = 'scripts/utils/proxy-checker.py'
                elif 'account' in item.lower() or 'create' in item.lower():
                    dst = f'scripts/account/{item}'
                else:
                    dst = f'scripts/utils/{item}'
                mover_arquivo(src, dst)
            elif item.endswith('.js'):
                mover_arquivo(f'execution/{item}', f'src/bot/workers/{item}')
    
    # Bot core
    mover_arquivo('manager.js', 'src/bot/orchestrator.js')
    mover_arquivo('debug_ai.js', 'src/bot/debug-ai.js')
    
    # SaaS
    if os.path.exists('saas') and 'src/saas' not in str(Path('saas').resolve()):
        mover_pasta('saas', 'src/saas/frontend')
    
    # Dados e logs
    mover_pasta('.tmp', 'storage/temp')
    mover_pasta('logs', 'storage/logs')
    
    # 4. Criar arquivos de configuração
    print("\n📄 Criando arquivos de configuração...")
    
    # .gitignore
    gitignore = """# Dados sensíveis
storage/cookies/
storage/data/*.json
config/environments/production.json
*.pem

# Logs
storage/logs/*.log

# Temporários
storage/temp/
.tmp/

# Node
node_modules/
npm-debug.log*

# Python
__pycache__/
*.pyc
venv/
.env

# IDE
.vscode/
.idea/
"""
    with open('.gitignore', 'w') as f:
        f.write(gitignore)
    print("  ✅ .gitignore")
    
    # .env.example
    env_example = """# Twitter Bot - Variáveis de Ambiente
NODE_ENV=development
PORT=3001

# Bot Settings
BOT_MAX_ACCOUNTS=10
BOT_DELAY_MIN=2
BOT_DELAY_MAX=5

# Proxy
PROXY_TIMEOUT=30

# SaaS
JWT_SECRET=change-this-in-production
"""
    with open('.env.example', 'w') as f:
        f.write(env_example)
    print("  ✅ .env.example")
    
    print("\n" + "="*60)
    print("🎉 REORGANIZAÇÃO CONCLUÍDA!")
    print("="*60)
    print("\n📋 Estrutura final:")
    for pasta in ['src', 'scripts', 'docs', 'config', 'storage']:
        if os.path.exists(pasta):
            print(f"  📁 {pasta}/")

if __name__ == "__main__":
    reorganizar()
