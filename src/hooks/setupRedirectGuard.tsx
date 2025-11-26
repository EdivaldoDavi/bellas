// src/guards/SetupRedirectGuard.tsx
import { useLocation, Navigate } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { needsSetup, loading, profile, tenant } = useUserTenant();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const isSetupPage = location.pathname === "/setup";
  const onboardingStep = tenant?.onboarding_step ?? 0;

  // 🔒 1. Force-reset nunca pode ser bloqueado
  if (location.pathname === "/force-reset") {
    return <>{children}</>;
  }

  // 🔒 2. Convite não deve cair no setup
  if ((profile as any)?.invited) {
    return <>{children}</>;
  }

  // ⏳ 3. Enquanto carregar dados, não tenta redirecionar
  if (loading || authLoading) {
    return <>{children}</>;
  }

  // 🚫 4. Se o onboarding NÃO terminou, setup NÃO pode interceptar
  // onb < 99 → onboard primeiro
  if (onboardingStep < 99) {
    return <>{children}</>;
  }

  // ✔️ 5. Agora SIM: onboarding terminou
  // Aplicamos regras normais do setup

  // Caso precisa fazer setup e não está no /setup → redireciona
  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  // Caso NÃO precisa setup e está no /setup → manda pro dashboard
  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }

  // Caso contrário → apenas renderiza o conteúdo
  return <>{children}</>;
}
