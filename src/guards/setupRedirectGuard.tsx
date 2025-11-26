// src/guards/SetupRedirectGuard.tsx
import { useLocation, Navigate } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { needsSetup, loading, profile, tenant } = useUserTenant();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const onboardingStep = tenant?.onboarding_step ?? 0;
  const isSetupPage = location.pathname.startsWith("/setup");

  // 1) Nunca interceptar force-reset
  if (location.pathname === "/force-reset") return <>{children}</>;

  // 2) Nunca interceptar login por convite
  if ((profile as any)?.invited) return <>{children}</>;

  // 3) Enquanto carrega → não fazer nada
  if (loading || authLoading) return <>{children}</>;

  // 4) 🔥 Se onboarding NÃO terminou, NÃO deixar o Setup entrar no fluxo
  // e NÃO redirecionar para setup enquanto o onboarding não acabar
  if (onboardingStep < 99) {
    return <>{children}</>;
  }

  // 5) Agora sim → fluxo normal do setup
  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
