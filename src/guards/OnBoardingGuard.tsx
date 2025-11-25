// src/guards/OnboardingGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { tenant, loading, needsSetup } = useUserTenant();
  const location = useLocation();

  if (loading) return null;

  if (!tenant) return <>{children}</>;

  const step = tenant.onboarding_step ?? 0;
  const isOnboardingPage = location.pathname.startsWith("/onboarding");
  const isSetupPage = location.pathname === "/setup";

  // ⭐ REGRA 1 — NOVO USUÁRIO: onboarding primeiro
  if (step === 0 && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  // ⭐ REGRA 2 — ONBOARDING EM ANDAMENTO (1 a 98)
  if (step > 0 && step < 99 && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  // ⭐ REGRA 3 — ONBOARDING FINALIZADO (99)
  // Agora sim o setup pode rodar se precisar
  if (step >= 99 && needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // ⭐ REGRA 4 — Tentou acessar onboarding finalizado
  if (step >= 99 && isOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
