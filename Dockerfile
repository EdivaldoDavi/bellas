# 1️⃣ — Etapa de build (Node)
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2️⃣ — Etapa de produção (Nginx)
FROM nginx:stable-alpine

# Copia o build do React para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Remove configurações padrões e adiciona cache para PWA
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
