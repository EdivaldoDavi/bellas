import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter } from "react-router-dom"; // Importar BrowserRouter aqui

import AuthProvider from "./context/AuthProvider";
import { UserTenantProvider } from "./context/UserTenantProvider";
import App from "./App";

import { registerSW } from "virtual:pwa-register";

// Ativar Service Worker
registerSW({
  onNeedRefresh() {
    console.log("⚠️ Nova versão disponível. Atualize a página para aplicar.");
  },
  onOfflineReady() {
    console.log("📡 App pronto para uso offline!");
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter> {/* BrowserRouter agora envolve tudo */}
      <AuthProvider>
        <UserTenantProvider>
          <App />
        </UserTenantProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);