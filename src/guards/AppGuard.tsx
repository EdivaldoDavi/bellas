import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "../context/AuthProvider";
import { useUserTenant } from "../context/UserTenantProvider";
import LoadingSpinner from "../components/LoadingSpinner";

interface AppGuardProps {
  children: ReactNode;
}

export function AppGuard({ children }: AppGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { tenant, profile, loading: userTenantLoading, needsSetup } = useUserTenant();
  const location = useLocation();

  const path = location.pathname;
  const isOnboardingRoute = path.startsWith("/onboarding");
  const isSetupRoute = path.startsWith("/setup");
  const isForceResetRoute = path === "/force-reset";

  // 1. Permitir acesso à rota de redefinição de senha imediatamente,
  //    independentemente do estado de autenticação ou setup.
  if (isForceResetRoute) {
    return <>{children}</>;
  }

  // 2. Lidar com o carregamento inicial de autenticação e dados do usuário/tenant
  if (authLoading || userTenantLoading) {
    return <LoadingSpinner message="Carregando informações do usuário e Studio..." />;
  }

  // 3. Redirecionar para login se não houver usuário autenticado
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 4. Lógica de redirecionamento para o Setup
  //    - Ignorar se o usuário foi convidado (eles não precisam passar pelo setup inicial)
  //    - Ignorar se já estamos na rota de setup
  if (!(profile as any)?.invited && needsSetup && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  // 5. Lógica de redirecionamento para o Onboarding
  //    - Só entra em cena se já existe um tenant (ou seja, após o setup)
  //    - Ignorar se já estamos na rota de onboarding
  //    - Ignorar se já estamos na rota de setup (onboarding vem depois do setup)
  if (tenant && (tenant.onboarding_step ?? 0) < 99 && !isOnboardingRoute && !isSetupRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // 6. Se o onboarding já terminou e o usuário tenta acessar a rota de onboarding, redireciona para o dashboard
  if (tenant && (tenant.onboarding_step ?? 0) >= 99 && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  // 7. Se todas as verificações passarem, renderiza os filhos
  return <>{children}</>;
}