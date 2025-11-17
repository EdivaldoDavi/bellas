// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";

import { useUserTenant } from "./context/UserTenantProvider";   // <-- HOOK GLOBAL
import { useAuth } from "./context/AuthProvider";

import { applyTenantTheme } from "./utils/theme";

// Layout e páginas
import { Layout } from "./components/layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Setup from "./pages/setup/Setup";
import Dashboard from "./pages/dashboard/Dashboard";
import SaloesPage from "./pages/SaloesPage";
import AssinaturasPage from "./pages/AssinaturasPage";
import PerfilPage from "./pages/PerfilPage";
import Agenda from "./components/Agenda";
import EmDesenvolvimento from "./components/EmDesenvolvimento";
import ConfigPage from "./pages/ConfigPage";
import ForcePasswordReset from "./components/ForcePasswordReset";
import ConnectWhatsAppPage from "./pages/ConnectWhatsAppPage";
import GerenciarAcessosPage from "./config/GerenciarAcessosPage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// =============================
// 🔹 TELA DE CARREGAMENTO GLOBAL
// =============================
function LoadingScreen() {
  return <div className="p-5 text-center">⏳ Carregando...</div>;
}

// =============================
// 🔐 ROTA PRIVADA
// =============================
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

// =============================
// 📌 GUARD DO SETUP
// =============================
function SetupRedirectGuard({ children }: { children: ReactNode }) {
  const { needsSetup, loading } = useUserTenant();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  const isSetupPage = location.pathname === "/setup";

  // 🔻 1. Se precisa de setup → vá para setup
  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // 🔺 2. Se NÃO precisa de setup e está na página de setup → vá para dashboard
  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// =============================
// 🔹 APP PRINCIPAL
// =============================
export default function App() {
  const { tenant } = useUserTenant();

  // 🎨 Aplicar tema automaticamente
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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/force-reset" element={<ForcePasswordReset />} />

          {/* Setup (Privada, Sem Layout) */}
          <Route
            path="/setup"
            element={
              <PrivateRoute>
                <Setup />
              </PrivateRoute>
            }
          />

          {/* Sem layout, mas privado */}
          <Route
            path="/gerenciar-acessos"
            element={
              <PrivateRoute>
                <GerenciarAcessosPage />
              </PrivateRoute>
            }
          />

          {/* Páginas públicas opcionais */}
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
