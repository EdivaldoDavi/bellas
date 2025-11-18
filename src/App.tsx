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
import ClientesPage from "./pages/ClientesPage";
// 🔥 Importar suas novas páginas
import ServicosPage from "./pages/ServicosPage";
// você criará depois:
//import ClientesPage from "./pages/ClientesPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
//import UsuariosPage from "./pages/UsuariosPage";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// =============================
// 🔹 TELA DE CARREGAMENTO GLOBAL
// =============================
function LoadingScreen() {
  return <div className="p-5 text-center">⏳ Carregando...</div>;
}

// =============================
// 🔐 ROTA PRIVADA COM EXCEÇÃO PARA /force-reset
// =============================
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (location.pathname === "/force-reset") return <>{children}</>;
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <>{children}</>;
}

// =============================
// 📌 GUARD DO SETUP
// =============================
function SetupRedirectGuard({ children }: { children: ReactNode }) {
  const { needsSetup, loading } = useUserTenant();
  const location = useLocation();

  if (location.pathname === "/force-reset") return <>{children}</>;
  if (loading) return <LoadingScreen />;

  const isSetupPage = location.pathname === "/setup";

  if (needsSetup && !isSetupPage) return <Navigate to="/setup" replace />;
  if (!needsSetup && isSetupPage) return <Navigate to="/dashboard" replace />;

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

          {/* Root → Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rotas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Reset */}
          <Route path="/force-reset" element={<ForcePasswordReset />} />

          {/* Setup */}
          <Route
            path="/setup"
            element={
              <PrivateRoute>
                <Setup />
              </PrivateRoute>
            }
          />

          {/* Sem Layout */}
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

          {/* Rotas privadas + Layout */}
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

            {/* === 👇 NOVAS ROTAS DO SIDEBAR 👇 === */}
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="/profissionais" element={<ProfessionalsPage />} />
            {/*<Route path="/usuarios" element={<UsuariosPage />} />*/}
          </Route>
        </Routes>
      </SetupRedirectGuard>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
