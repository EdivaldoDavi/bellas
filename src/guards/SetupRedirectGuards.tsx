// src/guards/SetupRedirectGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

interface Props {
  children: React.ReactNode;
}

export function SetupRedirectGuards({ children }: Props) {
  const { tenant, profile, loading } = useUserTenant();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const path = location.pathname;
  const isSetupRoute = path.startsWith("/setup");
  const isForceReset = path === "/force-reset";

  // 1. Nunca bloquear force-reset
  if (isForceReset) return <>{children}</>;

  // 2. Convites não fazem setup
  if ((profile as any)?.invited) return <>{children}</>;

  // 3. Aguardando dados carregarem
  if (loading || authLoading) return <>{children}</>;

  // 4. Se setup AINDA NÃO está completo → redirecionar para /setup
  if (tenant && tenant.setup_complete === false && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  // 5. Se setup JÁ está completo e o usuário tenta acessar /setup → redirecionar para dashboard
  if (tenant && tenant.setup_complete === true && isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  // 6. Fluxo normal
  return <>{children}</>;
}
