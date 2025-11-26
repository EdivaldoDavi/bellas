// src/guards/SetupRedirectGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider";

interface Props {
  children: React.ReactNode;
}

/**
 * Guard responsável APENAS por:
 *  - Levar o usuário para /setup quando ele PRECISA configurar um salão
 *  - Não interferir em:
 *    - /force-reset
 *    - /setup (wizard em andamento)
 *    - fluxo de convite (profile.invited)
 */
export function SetupRedirectGuard({ children }: Props) {
  const { needsSetup, loading, profile } = useUserTenant();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const path = location.pathname;
  const isSetupRoute = path.startsWith("/setup");
  const isForceReset = path === "/force-reset";

  // 1) Nunca bloquear tela de force-reset
  if (isForceReset) {
    return <>{children}</>;
  }

  // 2) Convite não entra em fluxo de setup obrigatório
  if ((profile as any)?.invited) {
    return <>{children}</>;
  }

  // 3) Enquanto auth / contexto estiver carregando, não decide nada
  if (loading || authLoading) {
    return <>{children}</>;
  }

  // 4) Se já está em /setup, NUNCA redireciona
  //    (deixa o wizard controlar os steps internos, ex.: Empresa / WhatsApp)
  if (isSetupRoute) {
    return <>{children}</>;
  }

  // 5) Fora do /setup:
  //    Se precisa de setup, manda para /setup
  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  // 6) Caso normal → só renderiza
  return <>{children}</>;
}
