# -------------------------------------------------------
# 1) Build da aplicação
# -------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 👉 GERAR .env COM AS VARIÁVEIS DO RUNTIME
# EasyPanel já injeta essas variáveis na build, mesmo sem Build Args
RUN echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" >> .env && \
    echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env && \
    echo "VITE_EVO_PROXY_URL=$VITE_EVO_PROXY_URL" >> .env && \
    echo "NODE_ENV=production" >> .env

RUN npm run build

# -------------------------------------------------------
# 2) Servir com SERVE na porta 80
# -------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
