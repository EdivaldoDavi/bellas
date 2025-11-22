// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";

import { useUserTenant } from "./context/UserTenantProvider";
import { useAuth } from "./context/AuthProvider";
import { applyTenantTheme } from "./utils/theme";

// Layout e páginas
import { Layout } from "./components/layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ForcePasswordReset from "./components/ForcePasswordReset";

import Setup from "./pages/setup/Setup";
import Dashboard from "./pages/dashboard/Dashboard";
import Agenda from "./components/Agenda";

import AssinaturasPage from "./pages/AssinaturasPage";
import SaloesPage from "./pages/SaloesPage";
import PerfilPage from "./pages/PerfilPage";
import ConfigPage from "./pages/ConfigPage";
import ConnectWhatsAppPage from "./pages/ConnectWhatsAppPage";
import GerenciarAcessosPage from "./config/GerenciarAcessosPage";
import EmDesenvolvimento from "./components/EmDesenvolvimento";

import ClientesPage from "./pages/ClientesPage";
import UsuariosPage from "./pages/UsuariosPage";
import ServicosPage from "./pages/ServicosPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


// =============================
// 🔹 TELA DE LOADING GLOBAL
// =============================
function LoadingScreen() {
  return <div className="p-5 text-center">⏳ Carregando...</div>;
}


// =============================
// 🔐 PRIVATE ROUTE
// =============================
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (location.pathname === "/force-reset") return <>{children}</>;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // CORREÇÃO: Retorna os children diretamente, sem se envolver em PrivateRoute novamente.
  return <>{children}</>;
}


// =============================
// 🛑 GUARD: BLOQUEAR DASHBOARD PARA PROFISSIONAIS
// =============================
function DashboardGuard({ children }: { children: ReactNode }) {
  const { profile } = useUserTenant();

  if (!profile) return null;

  // Profissionais e Staff AGORA podem ver o dashboard.
  // A lógica de qual dashboard mostrar (global, tenant, profissional)
  // será tratada DENTRO do componente Dashboard.tsx.
  // Este guard apenas garante que o usuário está logado e tem um perfil.
  
  return <>{children}</>;
}


// =============================
// 🧭 GUARD DO SETUP
// =============================
function SetupRedirectGuard({ children }: { children: ReactNode }) {
  const { needsSetup, loading } = useUserTenant();
  const location = useLocation();

  // Force reset nunca é bloqueado
  if (location.pathname === "/force-reset") return <>{children}</>;
  if (loading) return <LoadingScreen />;

  const isSetupPage = location.pathname === "/setup";

  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

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

  useEffect(() => {
    applyTenantTheme(tenant);
  }, [tenant]);

  return (
    <BrowserRouter>
      <SetupRedirectGuard>
        <Routes>

          {/* ROOT */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/force-reset" element={<ForcePasswordReset />} />

          {/* SETUP (private sem layout) */}
          <Route
            path="/setup"
            element={
              <PrivateRoute>
                <Setup />
              </PrivateRoute>
            }
          />

          {/* Rotas privadas SEM layout */}
          <Route
            path="/gerenciar-acessos"
            element={
              <PrivateRoute>
                <GerenciarAcessosPage />
              </PrivateRoute>
            }
          />

          {/* Opcional público */}
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/em-desenvolvimento" element={<EmDesenvolvimento />} />

          {/* PRIVATE + LAYOUT */}
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            {/* DASHBOARD COM GUARD */}
            <Route
              path="/dashboard"
              element={
                <DashboardGuard>
                  <Dashboard />
                </DashboardGuard>
              }
            />

            <Route path="/agenda" element={<Agenda />} />
            <Route path="/saloes" element={<SaloesPage />} />
            <Route path="/assinaturas" element={<AssinaturasPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/integracoes/whatsapp" element={<ConnectWhatsAppPage />} />

            {/* CRUDs */}
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="/profissionais" element={<ProfessionalsPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
          </Route>

        </Routes>
      </SetupRedirectGuard>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}