// src/guards/SetupRedirectGuard.tsx
import { useLocation, Navigate } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { needsSetup, loading } = useUserTenant();
  const location = useLocation();

  console.log("🔍 SetupRedirectGuard", {
    path: location.pathname,
    loading,
    needsSetup,
    userId: user?.id,
  });

  // ⏳ Ainda carregando? Não decide nada.
  if (loading) return <>{children}</>;

  // 🔐 Usuário não autenticado → Login trata isso
  if (!user) return <>{children}</>;

  const isSetupPage = location.pathname === "/setup";

  // 🟥 1) Usuário precisa fazer setup → direcionar para /setup
  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // 🟩 2) Usuário já configurou tenant → mas está em /setup → manda pro dashboard
  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // ✔️ Permite continuar a rota normal
  return <>{children}</>;
}
