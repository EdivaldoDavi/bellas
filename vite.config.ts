import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
     
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Meu Sistema de Agendamentos",
        short_name: "Agendamentos",
        description: "Sistema de agendamento com WhatsApp e IA.",
        theme_color: "#111827",
        background_color: "#020617",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // cache básico de rotas e assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.+/,
            handler: "NetworkFirst",
            options: {
              cacheName: "app-shell",
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // permite testar PWA em dev
      },
    }),
  ],
  server: {
    host: true,
  },
});
