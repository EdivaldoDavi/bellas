// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import {  type ReactNode } from "react";

import { useUserTenant } from "./context/UserTenantProvider";
import { useAuth } from "./context/AuthProvider";


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

import ConnectWhatsAppPage from "./pages/ConnectWhatsAppPage";
import GerenciarAcessosPage from "./config/GerenciarAcessosPage"; // Importar GerenciarAcessosPage

import UsuariosPage from "./pages/UsuariosPage";
import ServicosPage from "./pages/ServicosPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import ClientesPage from "./pages/ClientesPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import spinnerStyles from "./css/LoadingSpinner.module.css"; // Importar o CSS do spinner

import Onboarding from "./pages/onboarding/Onboarding";
import { OnboardingGuard } from "./guards/OnBoardingGuard";
//import { SetupRedirectGuard } from "./guards/SetupRedirectGuard";
import { SetupRedirectGuards } from "./guards/SetupRedirectGuards";
import { useApplyTenantTheme } from "./hooks/useApplyTenantTheme";
 
// =============================
// 🔹 TELA DE LOADING GLOBAL
// ============================= 
function LoadingScreen() {
  return (
    <div className={spinnerStyles.spinnerContainer}>
      <div className={spinnerStyles.spinner}></div>
      <p className={spinnerStyles.loadingText}>Carregando...</p>
    </div>
  );
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
/*
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

*/

// =============================
// 🔹 APP PRINCIPAL
// =============================
export default function App() {
  


  useApplyTenantTheme();

  return (
    <BrowserRouter>
      <Routes>

        {/* ROOT */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/force-reset" element={<ForcePasswordReset />} />


        {/* ============ ONBOARDING (PRIORIDADE ABSOLUTA) ============ */}
        <Route
          path="/onboarding/*"
          element={
            <PrivateRoute>
              <OnboardingGuard>
                <Onboarding />
              </OnboardingGuard>
            </PrivateRoute>
          }
        />


        {/* ============ SETUP ============ */}
        <Route
          path="/setup"
          element={
            <PrivateRoute>
              <OnboardingGuard>     {/* garante que não entra no setup antes do onboarding */}
                <SetupRedirectGuards>
                  <Setup />
                </SetupRedirectGuards>
              </OnboardingGuard>
            </PrivateRoute>
          }
        />


        {/* ============ PRIVATE ROUTES COM LAYOUT ============ */}
        <Route
          element={
            <PrivateRoute>
              <OnboardingGuard>      {/* onboarding entra antes */}
                <SetupRedirectGuards> {/* setup entra só depois */}
                  <Layout />
                </SetupRedirectGuards>
              </OnboardingGuard>
            </PrivateRoute>
          }
        >

          {/* DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <DashboardGuard>
                <Dashboard />
              </DashboardGuard>
            }
          />

          {/* ===================== OUTRAS ROTAS PRIVADAS ===================== */}
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/saloes" element={<SaloesPage />} />
          <Route path="/assinaturas" element={<AssinaturasPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/integracoes/whatsapp" element={<ConnectWhatsAppPage />} />
          <Route path="/gerenciar-acessos" element={<GerenciarAcessosPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/profissionais" element={<ProfessionalsPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />

        </Route>

      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
