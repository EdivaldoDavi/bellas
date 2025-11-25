// src/guards/OnboardingGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { tenant, loading, needsSetup } = useUserTenant();
  const location = useLocation();

  if (loading) return null;

  // Não tem tenant ainda (carregamento inicial ou login de convite)
  if (!tenant) return <>{children}</>;

  const step = tenant.onboarding_step ?? 0;
  const isOnboardingPage = location.pathname.startsWith("/onboarding");
  const isSetupPage = location.pathname === "/setup";

  /**
   * 🔒 REGRA 1 — Se precisa de setup mas ainda está no passo 0 do onboarding,
   * assumimos que é primeira instalação → PRIORIDADE é o ONBOARDING.
   */
  if (needsSetup && step === 0 && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  /**
   * 🔒 REGRA 2 — Se precisa de setup e já passou do passo 0 do onboarding,
   * então permite ir ao setup normalmente.
   */
  if (needsSetup && step > 0 && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  /**
   * 🔒 REGRA 3 — Se onboarding já terminou
   * e o usuário tenta acessar /onboarding, envia para dashboard.
   */
  if (step >= 99 && isOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * 🔒 REGRA 4 — Onboarding NÃO finalizado
   * e usuário tenta acessar outra rota que não /setup,
   * redirecionar para onboarding.
   */
  if (step < 99 && !isOnboardingPage && !isSetupPage) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
