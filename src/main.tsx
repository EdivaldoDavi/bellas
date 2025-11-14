import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";

import AuthProvider from "./hooks/useAuth";
import App from "./App.tsx";

// 👇 Importa o registrador do Service Worker (vite-plugin-pwa)
import { registerSW } from "virtual:pwa-register";

// 👇 Ativa o service worker com atualização automática
registerSW({
  onNeedRefresh() {
    console.log("⚠️ Nova versão disponível. Atualize a página para aplicar.");
    // Aqui você pode abrir um modal/toast automático depois
  },
  onOfflineReady() {
    console.log("📡 App pronto para uso offline!");
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
