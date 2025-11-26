// src/guards/OnBoardingGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";

interface Props {
  children: React.ReactNode;
}

/**
 * Guard do ONBOARDING:
 *  - Só entra em cena quando já existe tenant
 *  - NÃO interfere em:
 *    - /force-reset
 *    - /setup (wizard de empresa/cores/whatsapp)
 */
export function OnboardingGuard({ children }: Props) {
  const { tenant, loading } = useUserTenant();
  const location = useLocation();

  const path = location.pathname;
  const isOnboardingRoute = path.startsWith("/onboarding");
  const isSetupRoute = path.startsWith("/setup");
  const isForceReset = path === "/force-reset";

  // 1) Carregando contexto → não decide ainda
  if (loading) {
    return null;
  }

  // 2) Sem tenant (ex.: usuário convidado, usuário sem salão) → não há onboarding
  if (!tenant) {
    return <>{children}</>;
  }

  const step = tenant.onboarding_step ?? 0;

  // 3) Nunca bloquear force-reset
  if (isForceReset) {
    return <>{children}</>;
  }

  // 4) Enquanto estiver no /setup, onboarding NÃO interfere
  //    (setup vem ANTES do onboarding)
  if (isSetupRoute) {
    return <>{children}</>;
  }

  // 5) Se onboarding NÃO terminou (0–98) e não estamos em /onboarding,
  //    força usuário para o fluxo de onboarding
  if (step < 99 && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // 6) Se onboarding JÁ terminou (99+) e tentar acessar /onboarding,
  //    redireciona para dashboard
  if (step >= 99 && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  // 7) Caso normal → apenas renderiza
  return <>{children}</>;
}
