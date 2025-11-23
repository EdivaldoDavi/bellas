// src/guards/SetupRedirectGuard.tsx
import { useLocation, Navigate } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { needsSetup, loading, profile } = useUserTenant();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const isSetupPage = location.pathname === "/setup";

  // 🔥 Nunca interceptar force-reset
  if (location.pathname === "/force-reset") {
    return <>{children}</>;
  }

  // 🔥 Não interfere durante login de convite
  if (profile?.invited) { // Usando a propriedade 'invited'
    return <>{children}</>;
  }

  // 🚫 IMPORTANTE:
  // Enquanto estiver carregando, NÃO desmonta a tela atual.
  // Isso evita o "refresh" visual ao voltar para a aba.
  if (loading || authLoading) {
    return <>{children}</>;
  }

  // Agora, só faz redirect quando temos estado estável (sem loading)

  // Precisa fazer setup e não está na página de setup -> manda pro /setup
  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // Não precisa mais de setup e está em /setup -> manda pro /dashboard
  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}