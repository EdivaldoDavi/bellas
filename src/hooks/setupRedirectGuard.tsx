
import {  useLocation, Navigate } from "react-router-dom";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { needsSetup, loading } = useUserAndTenant();
  const location = useLocation();

  // 🔎 DEBUG opcional
  console.log("🔍 SetupRedirectGuard", {
    path: location.pathname,
    loading,
    needsSetup,
    userId: user?.id,
  });

  // ⏳ Enquanto carregando, não decide nada
  if (loading) return <>{children}</>;

  // 🔐 Sem usuário → não faz nada (Login/Registro tratarão isso)
  if (!user) return <>{children}</>;

  const isSetupPage = location.pathname === "/setup";

  // 🟥 1) Deve ir para /setup
  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // 🟩 2) Já fez setup → mas está na página de setup → manda para dashboard
  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // ✔️ Continua para a rota
  return <>{children}</>;
}
