// src/guards/SetupRedirectGuard.tsx
import { useLocation, Navigate } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { needsSetup, loading, profile } = useUserTenant();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  // 🔥 Nunca interceptar force-reset
  if (location.pathname === "/force-reset") {
    return <>{children}</>;
  }

  // 🔥 Não interfere durante login de convite
  if (profile?.invited) {
    return <>{children}</>;
  }

  if (loading || authLoading) {
    return <div className="p-5 text-center">Carregando...</div>;
  }

  const isSetupPage = location.pathname === "/setup";

  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
