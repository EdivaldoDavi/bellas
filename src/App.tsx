// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useUserAndTenant } from "./hooks/useUserAndTenant";
import { applyTenantTheme } from "./utils/theme";

import { Layout } from "./components/layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Setup from "./pages/setup/Setup";
import Dashboard from "./pages/dashboard/Dashboard";
import SaloesPage from "./pages/SaloesPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AssinaturasPage from "./pages/AssinaturasPage";
import PerfilPage from "./pages/PerfilPage";
import Agenda from "./components/Agenda";
import EmDesenvolvimento from "./components/EmDesenvolvimento";
import ConfigPage from "./pages/ConfigPage";
import ForcePasswordReset from "./components/ForcePasswordReset";
import ConnectWhatsAppPage from "./pages/ConnectWhatsAppPage";
import GerenciarAcessosPage from "./config/GerenciarAcessosPage";

import { useAuth } from "./context/AuthProvider";

// 🔹 Tela de loading global
function LoadingScreen() {
  return <div className="p-5 text-center">⏳ Carregando...</div>;
}

// 🔐 Rota privada
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

// 📌 Onboarding automático → Sem tenant → Vai para /setup
function SetupRedirectGuard({ children }: { children: ReactNode }) {
  const { needsSetup, loading } = useUserAndTenant();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
// 1) Quando precisa fazer setup → /setup
if (!loading && needsSetup && location.pathname !== "/setup") {
  return <Navigate to="/setup" replace />;
}

// 2) Quando NÃO precisa de setup e está na página de setup → /dashboard
if (!loading && !needsSetup && location.pathname === "/setup") {
  return <Navigate to="/dashboard" replace />;
}

  return <>{children}</>;
}

// 🔹 App principal
export default function App() {
  const { tenant } = useUserAndTenant();

  // Aplicar tema automaticamente
  useEffect(() => {
    applyTenantTheme(tenant);
  }, [tenant]);

  return (
    <BrowserRouter>
      <SetupRedirectGuard>
        <Routes>
          {/* Root → Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/force-reset" element={<ForcePasswordReset />} />

          {/* Setup (privada e SEM layout) */}
          <Route
            path="/setup"
            element={
              <PrivateRoute>
                <Setup />
              </PrivateRoute>
            }
          />

          {/* Rota privada sem layout */}
          <Route
            path="/gerenciar-acessos"
            element={
              <PrivateRoute>
                <GerenciarAcessosPage />
              </PrivateRoute>
            }
          />

          {/* Rota pública opcional */}
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/em-desenvolvimento" element={<EmDesenvolvimento />} />

          {/* Rotas privadas + layout */}
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/saloes" element={<SaloesPage />} />
            <Route path="/assinaturas" element={<AssinaturasPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/integracoes/whatsapp" element={<ConnectWhatsAppPage />} />
          </Route>
        </Routes>
      </SetupRedirectGuard>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
