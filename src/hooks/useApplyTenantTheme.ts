// src/hooks/useApplyTenantTheme.ts
import { useEffect } from "react";
import { useUserTenant } from "../context/UserTenantProvider";
import { applyTenantTheme } from "../utils/theme";

export function useApplyTenantTheme() {
  const { tenant } = useUserTenant();

  useEffect(() => {
    applyTenantTheme(tenant);
  }, [tenant]);
}
