# Dockerfile — funciona em Render, Fly.io, Railway, ou qualquer container
FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Cria o diretório de dados (o volume persistente monta aqui)
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server/index.js"]
