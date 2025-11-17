// src/main.tsx
import { createRoot } from "react-dom/client";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";

import AuthProvider from "./context/AuthProvider";
import App from "./App.tsx";

import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {
    console.log("⚠️ Nova versão disponível. Atualize a página para aplicar.");
  },
  onOfflineReady() {
    console.log("📡 App pronto para uso offline!");
  },
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
