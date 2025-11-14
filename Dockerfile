# -------------------------------------------------------
# 1) Build da aplicação
# -------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# 👉 RECEBER build args enviados pelo EasyPanel
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_EVO_PROXY_URL
ARG NODE_ENV

# 👉 EXPORTAR como variáveis de ambiente para o Vite
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_EVO_PROXY_URL=$VITE_EVO_PROXY_URL
ENV NODE_ENV=$NODE_ENV

COPY package*.json ./
RUN npm install

COPY . .

# 👉 (opcional) gerar .env que o Vite também reconhece
RUN echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" >> .env && \
    echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env && \
    echo "VITE_EVO_PROXY_URL=$VITE_EVO_PROXY_URL" >> .env && \
    echo "NODE_ENV=$NODE_ENV" >> .env

# 👉 Agora funciona
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
