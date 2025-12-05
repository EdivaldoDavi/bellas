// src/hooks/useApplyTenantTheme.ts
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUserTenant } from "../context/UserTenantProvider";
import { applyTenantTheme } from "../utils/theme";

export function useApplyTenantTheme() {
  const { tenant } = useUserTenant();
  const location = useLocation();

  useEffect(() => {
    const isOnboardingRoute = location.pathname.startsWith("/onboarding");

    // No onboarding, aplique SEMPRE as cores padrão
    // No restante do app, aplique as cores do tenant.
    if (isOnboardingRoute) {
      applyTenantTheme(null);
    } else {
      applyTenantTheme(tenant);
    }
  }, [tenant, location.pathname]);
}