import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";

import { useAuth } from "../context/AuthProvider";
import { useUserTenant } from "../context/UserTenantProvider";

import LoadingSpinner from "../components/LoadingSpinner";
import SetupLayout from "../components/layout/SetupLayout";
interface AppGuardProps {
  children: ReactNode;
}

export function AppGuard({ children }: AppGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const {
    tenant,
    loading: tenantLoading,
    needsSetup,
  } = useUserTenant();

  const location = useLocation();
  const path = location.pathname;

  // Rotas especiais
  const isForceReset = path === "/force-reset";
  const isSetupRoute = path.startsWith("/setup");
  const isOnboardingRoute = path.startsWith("/onboarding");

  /* =======================================================
     1) Permitir acesso total ao Force Reset
  ======================================================= */
  if (isForceReset) {
    return <>{children}</>;
  }

  /* =======================================================
     2) Exibir spinner até carregar usuário + tenant
  ======================================================= */
  if (authLoading || tenantLoading) {
    return <LoadingSpinner message="Carregando informações..." />;
  }

  /* =======================================================
     3) Se não estiver logado → login
  ======================================================= */
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  /* =======================================================
     4) SETUP — Nenhum tenant ainda
  ======================================================= */
  if (needsSetup) {
    // Se tentar acessar qualquer página que não seja /setup → redireciona
    if (!isSetupRoute) {
      return <Navigate to="/setup" replace />;
    }

    // Layout isolado (sem sidebar, sem header)
    return <SetupLayout>{children}</SetupLayout>;
  }

  /* =======================================================
     5) ONBOARDING — Tenant criado, mas onboarding incompleto
  ======================================================= */
  const onboardingStep = tenant?.onboarding_step ?? 0;

  if (onboardingStep < 99) {
    // Se tentar sair do onboarding → força retorno
    if (!isOnboardingRoute && !isSetupRoute) {
      return <Navigate to="/onboarding" replace />;
    }

    // Onboarding roda isolado também
    return <SetupLayout>{children}</SetupLayout>;
  }

  /* =======================================================
     6) Onboarding finalizado, mas usuário tenta entrar nele
  ======================================================= */
  if (onboardingStep >= 99 && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  /* =======================================================
     7) Rotas normais — Layout completo com Sidebar/Header
  ======================================================= */
  return <>{children}</>;
}
