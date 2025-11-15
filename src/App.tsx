import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { useUserAndTenant } from "./hooks/useUserAndTenant";
import { supabase } from "./lib/supabaseCleint";
import { applyTenantTheme } from "./utils/theme";

import { Layout } from "./components/layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Setup from "./pages/setup/Setup";
import Dashboard from './pages/dashboard/Dashboard';
import SaloesPage from "./pages/SaloesPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AssinaturasPage from "./pages/AssinaturasPage";
import PerfilPage from "./pages/PerfilPage";
import Agenda from "./components/Agenda";
import EmDesenvolvimento from "./components/EmDesenvolvimento";
import ConfigPage from "./pages/ConfigPage";
import ForcePasswordReset from "./components/ForcePasswordReset";
// ✅ IMPORTA A NOVA PÁGINA
import ConnectWhatsAppPage from './pages/ConnectWhatsAppPage';
import GerenciarAcessosPage from "./config/GerenciarAcessosPage";

// 🔹 Loading enquanto verifica auth
function LoadingScreen() {
  return <div className="p-5 text-center">⏳ Carregando...</div>;
}

// 🔹 Rota privada
function PrivateRoute({ children }: { children: ReactNode }) {
  const { loading, profile } = useUserAndTenant();

  // ⏳ Enquanto carrega o estado de autenticação, não renderiza nada
  if (loading) return <LoadingScreen />;

  // ❌ Se não há perfil, significa realmente que não está logado
  if (!profile) return <Navigate to="/login" replace />;

  // ✅ Agora sim pode acessar
  return <>{children}</>;
}


// 🔹 App principal
export default function App() {
  const { tenant } = useUserAndTenant();

  // Aplicar o tema do tenant
  useEffect(() => {
    applyTenantTheme(tenant);
  }, [tenant]);

  // Manter sessão autenticada
  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(() => {});
    return () => subscription.unsubscribe();
  }, []);
// 🔥 Auto-login após confirmação de email Supabase
// 🔥 Auto-login após confirmação de email Supabase



  return (
    <BrowserRouter>
      <Routes>
        {/* Redirecionamento padrão */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/force-reset" element={<ForcePasswordReset />} />

        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/gerenciar-acessos"
          element={
            <PrivateRoute>
              <GerenciarAcessosPage />
            </PrivateRoute>
          }
        />
        {/* Setup (privada sem layout) */}
        <Route
          path="/setup"
          element={
            <PrivateRoute>
              <Setup />
            </PrivateRoute>
          }
        />
        {/* Em Desenvolvimento */}

  <Route path="/config" element={<ConfigPage />} />

       <Route path="/em-desenvolvimento" element={<EmDesenvolvimento />} />
        {/* Rotas protegidas com layout */}
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

          {/* ✅ ✅ ✅ NOVA ROTA DO WHATSAPP */}
          <Route
            path="/integracoes/whatsapp"
            element={<ConnectWhatsAppPage />}
          />
        </Route>
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
