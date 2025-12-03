// src/guards/SetupRedirectGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

interface Props {
  children: React.ReactNode;
}

/**
 * 🚦 SetupRedirectGuard (versão corrigida)
 *
 * Regras:
 * - Se o usuário ainda está no onboarding (onboarding_step < 5):
 *     → Sempre mandar para /setup
 *
 * - EXCEÇÕES (não redireciona):
 *     → /force-reset
 *     → convites
 *     → carregamento
 *     → /setup (já está dentro do wizard)
 */
export function SetupRedirectGuards({ children }: Props) {
  const { tenant, profile, loading } = useUserTenant();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const path = location.pathname;
  const isSetupRoute = path.startsWith("/setup");
  const isForceReset = path === "/force-reset";

  // --------------------------
  // ⛔ 1. Nunca interceptar /force-reset
  // --------------------------
  if (isForceReset) {
    return <>{children}</>;
  }

  // --------------------------
  // ⛔ 2. Usuário convidado não faz setup
  // --------------------------
  if ((profile as any)?.invited) {
    return <>{children}</>;
  }

  // --------------------------
  // ⏳ 3. Enquanto carregando, não decide
  // --------------------------
  if (loading || authLoading) {
    return <>{children}</>;
  }

  // --------------------------
  // ✔ 4. Está dentro do /setup? Permite continuar
  // --------------------------
  if (isSetupRoute) {
    return <>{children}</>;
  }

  // --------------------------
  // 🎯 5. Regra REAL do fluxo de setup:
  // Se o tenant existe e não terminou onboarding (step < 5)
  // → Redirecionar para /setup
  // --------------------------
  if (tenant && typeof tenant.onboarding_step === "number") {
    if (tenant.onboarding_step < 5) {
      console.log(
        "➡️ SetupRedirectGuard: Usuário ainda no onboarding. Redirecionando para /setup"
      );
      return <Navigate to="/setup" replace />;
    }
  }

  // --------------------------
  // ✔ 6. Caso normal → segue fluxo
  // --------------------------
  return <>{children}</>;
}
