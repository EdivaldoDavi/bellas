# -------------------------------------------------------
# 1) BUILD DA APLICAÇÃO (VITE)
# -------------------------------------------------------
FROM node:20-slim AS build

WORKDIR /app

# 👉 Receber build args do EasyPanel
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_EVO_PROXY_URL
ARG NODE_ENV

# 👉 Exportar para ambiente para o Vite
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_EVO_PROXY_URL=$VITE_EVO_PROXY_URL
ENV NODE_ENV=$NODE_ENV

# 👉 Garantir que npm existe (evita exit code 127)
RUN node -v && npm -v

COPY package*.json ./
RUN npm install

COPY . .

RUN echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" >> .env && \
    echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env && \
    echo "VITE_EVO_PROXY_URL=$VITE_EVO_PROXY_URL" >> .env && \
    echo "NODE_ENV=$NODE_ENV" >> .env

# Build de produção
RUN npm run build

# -------------------------------------------------------
# 2) SERVIR A APLICAÇÃO EM PRODUÇÃO
# -------------------------------------------------------
FROM node:20-slim

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
