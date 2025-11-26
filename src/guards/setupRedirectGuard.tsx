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

  // 🔒 Não bloquear force-reset
  if (location.pathname === "/force-reset") return <>{children}</>;

  // 🔒 Não bloquear convites
  if ((profile as any)?.invited) return <>{children}</>;

  // ⏳ Ainda carregando → não decide nada ainda
  if (loading || authLoading) return <>{children}</>;

  // 🚫 Se onboarding NÃO terminou (<99), o setup NÃO PODE INTERFERIR
  if (onboardingStep < 99) {
    return <>{children}</>;
  }

  // ✔️ Onboarding terminou → agora sim as regras normais de setup

  if (needsSetup && !isSetupPage) {
    return <Navigate to="/setup" replace />;
  }

  if (!needsSetup && isSetupPage) {
    return <Navigate to="/dashboard" replace />;
  }
console.log("SETUP GUARD rodou", {
  needsSetup,
  onboardingStep: tenant?.onboarding_step,
  path: location.pathname
});

  return <>{children}</>;
}
