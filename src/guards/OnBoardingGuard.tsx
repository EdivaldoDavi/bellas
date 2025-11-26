// src/guards/OnBoardingGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { tenant, loading } = useUserTenant();
  const location = useLocation();

  // Ainda carregando dados
  if (loading) return null;

  // Sem tenant (ex: login de convite, usuário sem tenant ainda)
  if (!tenant) return <>{children}</>;

  const step = tenant.onboarding_step ?? 0;
  const isOnboardingPage = location.pathname.startsWith("/onboarding");

  // 🔹 Se onboarding NÃO terminou (0 a 98) e não estamos na página de onboarding,
  // sempre redireciona para /onboarding
  if (step < 99 && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace />;
  }

  // 🔹 Se onboarding JÁ terminou (99+) e tentar acessar /onboarding,
  // manda para o dashboard
  if (step >= 99 && isOnboardingPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // Caso normal: apenas renderiza
  return <>{children}</>;
}
