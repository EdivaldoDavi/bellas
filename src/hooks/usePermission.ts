import { useMemo } from "react";
import { useUserAndTenant } from "./useUserAndTenant";

export function usePermission() {
  const { profile, features, permissions } = useUserAndTenant();

  const role = profile?.role;

  return useMemo(
    () => ({
      /** 🔥 Papéis principais */
      isOwner: role === "owner",
      isManager: role === "manager",
      isProfessional: role === "professional",
      isStaff: role === "staff",
      isClient: role === "client",

      /** 🔥 Features liberadas pelo plano */
      feature: (key: string) => features.includes(key) || role === "owner",

      /** 🔥 Permissões individuais */
      perm: (key: string) =>
        permissions.includes(key) ||
        role === "manager" ||
        role === "owner",
    }),
    [role, features, permissions]
  );
}
