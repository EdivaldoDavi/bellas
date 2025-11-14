# -------------------------------------------------------
# 1) Build da aplicação (VITE)
# -------------------------------------------------------
FROM node:20-slim AS build

WORKDIR /app

# 👉 Receber build args do EasyPanel
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_EVO_PROXY_URL
ARG NODE_ENV

# 👉 Exportar para ambiente do Vite
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_EVO_PROXY_URL=$VITE_EVO_PROXY_URL
ENV NODE_ENV=$NODE_ENV

COPY package*.json ./
RUN npm install

COPY . .

# 👉 Criar arquivo .env.production (Vite realmente lê este!)
RUN echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL"        > .env.production && \
    echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env.production && \
    echo "VITE_EVO_PROXY_URL=$VITE_EVO_PROXY_URL" >> .env.production && \
    echo "NODE_ENV=production" >> .env.production

# 👉 Build final
RUN npm run build

# -------------------------------------------------------
# 2) Servir em produção
# -------------------------------------------------------
FROM node:20-slim

WORKDIR /app
WORKDIR /app
ARG CACHE_BUST=1

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
