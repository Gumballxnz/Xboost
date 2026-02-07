
#!/bin/bash

# XBoost Deploy Script for Oracle Cloud / Ubuntu
# Executar: chmod +x deploy.sh && ./deploy.sh

echo "🚀 Iniciando Setup do XBoost SaaS..."

# 1. Update & Install Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
    echo "✅ Docker já instalado."
fi

# 2. Configurar .env (Prompt ou Copiar)
if [ ! -f .env ]; then
    echo "⚠️ Arquivo .env não encontrado!"
    echo "Por favor, crie o arquivo .env com suas credenciais."
    exit 1
fi

# 3. Build & Run
echo "🏗️ Construindo containers..."
sudo docker compose up -d --build

echo "✅ Deploy Concluído!"
echo "📡 API rodando na porta 3000"
echo "Monitorar logs: sudo docker compose logs -f"
