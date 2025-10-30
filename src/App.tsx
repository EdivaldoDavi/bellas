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
// 🔹 Loading enquanto verifica auth
function LoadingScreen() {
  return <div className="p-5 text-center">⏳ Carregando...</div>;
}

// 🔹 Rota privada
function PrivateRoute({ children }: { children: ReactNode }) {
  const { loading, user } = useUserAndTenant();
  if (loading) return <LoadingScreen />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {});
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirecionamento padrão */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Setup (privada sem layout) */}
        <Route
          path="/setup"
          element={
            <PrivateRoute>
              <Setup />
            </PrivateRoute>
          }
        />

        {/* Rotas protegidas com layout */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/saloes" element={<SaloesPage />} /> {/* ✅ Nova rota */}
        <Route path="/assinaturas" element={<AssinaturasPage />} /> {/* ✅ Nova rota */}
          <Route path="/perfil" element={<PerfilPage />} /> {/* ✅ Nova rota */}
          {/* Futuras rotas */}
          <Route path="/agenda" element={<Agenda />} />
          {/* <Route path="/clientes" element={<Clientes />} /> */}
        </Route>
      </Routes>

      {/* ✅ Toasts globais ficam fora do Router para não reiniciar a cada change */}
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}
