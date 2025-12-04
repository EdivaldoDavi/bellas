import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";

import { useAuth } from "../context/AuthProvider";
import { useUserTenant } from "../context/UserTenantProvider";

import LoadingSpinner from "../components/LoadingSpinner";
import SetupLayout from "../layouts/SetupLayout"; // 👈 IMPORTANTE

interface AppGuardProps {
  children: ReactNode;
}

export function AppGuard({ children }: AppGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const {
    tenant,
    profile,
    loading: tenantLoading,
    needsSetup,
  } = useUserTenant();

  const location = useLocation();
  const path = location.pathname;

  const isForceReset = path === "/force-reset";
  const isSetup = path.startsWith("/setup");
  const isOnboarding = path.startsWith("/onboarding");

  /* =======================================================
     1) Force Reset SEM interferência do Guard
  ======================================================= */
  if (isForceReset) return <>{children}</>;

  /* =======================================================
     2) Carregamento inicial
  ======================================================= */
  if (authLoading || tenantLoading) {
    return <LoadingSpinner message="Carregando informações..." />;
  }

  /* =======================================================
     3) Se não estiver logado → vai para login
  ======================================================= */
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  /* =======================================================
     4) SETUP (tenant ainda não criado)
     - Usuário precisa finalizar o setup antes de acessar a app.
  ======================================================= */
  if (needsSetup) {
    // Se não está na rota /setup → manda pra lá
    if (!isSetup) {
      return <Navigate to="/setup" replace />;
    }

    // Se está em /setup → isola layout (SEM sidebar/header)
    return <SetupLayout>{children}</SetupLayout>;
  }

  /* =======================================================
     5) ONBOARDING (tenant existe mas onboarding < 99)
  ======================================================= */
  const onboardingStep = tenant?.onboarding_step ?? 0;

  if (onboardingStep < 99) {
    if (!isOnboarding && !isSetup) {
      return <Navigate to="/onboarding" replace />;
    }

    // Isolado igual setup
    return <SetupLayout>{children}</SetupLayout>;
  }

  /* =======================================================
     6) Se onboarding já terminou e está na rota /onboarding → dashboard
  ======================================================= */
  if (onboardingStep >= 99 && isOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  /* =======================================================
     7) Tudo ok → renderiza layout normal (sidebar/header)
  ======================================================= */
  return <>{children}</>;
}
