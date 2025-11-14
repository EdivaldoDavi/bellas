# -------------------------------------------------------
# 1) Build da aplicação (VITE)
# -------------------------------------------------------
FROM node:20-slim AS build

WORKDIR /app


COPY package*.json ./
RUN npm install

COPY . .


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
