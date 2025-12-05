// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";


import { useAuth } from "./context/AuthProvider";


// Layout e páginas
import { Layout } from "./components/layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ForcePasswordReset from "./components/ForcePasswordReset";

import EmDesenvolvimento from "./components/EmDesenvolvimento";
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
import CommissionsPage from "./pages/ComissionsPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Importar o LoadingSpinner para uso global
import LoadingSpinner from "./components/LoadingSpinner";

import Onboarding from "./pages/onboarding/Onboarding";
import ScheduleWizardPage from "./pages/schedule/ScheduleWizardPage";
// import { OnboardingGuard } from "./guards/OnBoardingGuard"; // REMOVIDO
// import { SetupRedirectGuards } from "./guards/SetupRedirectGuards"; // REMOVIDO
import { useApplyTenantTheme } from "./hooks/useApplyTenantTheme";

// Importar o novo componente de rota protegida
// import { AuthRequiredRoute } from "./guards/AuthRequiredRoute"; // REMOVIDO
import { AppGuard } from "./guards/AppGuard"; // NOVO: Importar o AppGuard
 
console.log("App.tsx rendered"); // Adicionado para depuração


// =============================
// 🔹 APP PRINCIPAL
// =============================
export default function App() {
  const { loading: authLoading } = useAuth(); // Verifica o estado de carregamento da autenticação
  useApplyTenantTheme(); // Hook chamado incondicionalmente

  // Se a autenticação ainda estiver carregando, exibe um spinner global
  if (authLoading) {
    return <LoadingSpinner message="Carregando autenticação..." />;
  }

  return (
    <> {/* Fragmento adicionado aqui */}
      <Routes>

        {/* ROOT */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/force-reset" element={<ForcePasswordReset />} />
        <Route path="/config" element={<EmDesenvolvimento />} />

        {/* ============ ROTAS PROTEGIDAS COM APP GUARD ============ */}
        <Route
          element={
            <AppGuard>
              <Layout />
            </AppGuard>
          }
        >
          {/* DASHBOARD */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* ONBOARDING */}
          <Route path="/onboarding/*" element={<Onboarding />} />
          <Route path="/onboarding/agendar" element={<ScheduleWizardPage />} />

          {/* SETUP */}
          <Route path="/setup" element={<Setup />} />

          {/* ===================== OUTRAS ROTAS PRIVADAS ===================== */}
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/agenda/novo" element={<ScheduleWizardPage />} />
          <Route path="/saloes" element={<SaloesPage />} />
          <Route path="/assinaturas" element={<AssinaturasPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/integracoes/whatsapp" element={<ConnectWhatsAppPage />} />
          <Route path="/gerenciar-acessos" element={<GerenciarAcessosPage />} />
          
          {/* ROTAS DE CLIENTES */}
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/new" element={<ClientesPage />} />
          <Route path="/clientes/edit/:id" element={<ClientesPage />} />

          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/servicos/new" element={<ServicosPage />} />
          <Route path="/servicos/edit/:id" element={<ServicosPage />} />

          <Route path="/profissionais" element={<ProfessionalsPage />} />
          <Route path="/profissionais/new" element={<ProfessionalsPage />} />
          <Route path="/profissionais/edit/:id" element={<ProfessionalsPage />} />

          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/commissions" element={<CommissionsPage />} /> {/* Nova rota para CommissionsPage */}

        </Route>

      </Routes>

      <ToastContainer position="top-right" autoClose={3000}   closeButton={false} />
    </>
  );
}

// =============================
// 🛑 GUARD: BLOQUEAR DASHBOARD PARA PROFISSIONAIS
// =============================
// REMOVIDO: DashboardGuard não é mais necessário como componente separado,
// sua lógica de permissão será tratada dentro do DashboardRouter ou AppGuard.
// function DashboardGuard({ children }: { children: ReactNode }) {
//   const { profile } = useUserTenant(); 
//   if (!profile) {
//     return (
//       <div style={{ padding: 20, textAlign: "center", color: "red" }}>
//         Erro: Perfil do usuário não disponível.
//       </div>
//     );
//   }
//   return <>{children}</>;
// }