// src/guards/OnboardingGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { tenant, loading, needsSetup } = useUserTenant();
  const location = useLocation();

  // Ainda carregando dados
  if (loading) return null;

  // Sem tenant ainda (provavelmente antes do setup)
  if (!tenant) return <>{children}</>;

  const step = tenant.onboarding_step ?? 0;
  const isOnboardingPage = location.pathname.startsWith("/onboarding");
  const isSetupPage = location.pathname === "/setup";

  // 🚫 Se ainda precisa de setup, não forçamos onboarding
  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // ✅ Onboarding já finalizado e tentando acessar /onboarding
  if (step >= 99 && isOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // 🔁 Onboarding não finalizado e usuário está fora de /onboarding
  if (step < 99 && !isOnboardingPage && !isSetupPage) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
