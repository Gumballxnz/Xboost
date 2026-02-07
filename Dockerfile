
FROM node:18-alpine

WORKDIR /app

# Instalar dependências de sistema (necessário para Puppeteer se for rodar real, mas aqui é só backend)
# RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

# Copiar package*.json do backend
COPY src/backend/package*.json ./src/backend/

# Instalar deps do backend
WORKDIR /app/src/backend
RUN npm install

# Copiar todo o código fonte (Backend e Root scripts se necessário)
WORKDIR /app
COPY . .

# Expor porta e definir comando padrão
EXPOSE 3000
CMD ["node", "src/backend/server.js"]
