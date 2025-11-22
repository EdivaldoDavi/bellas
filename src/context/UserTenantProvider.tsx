import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
} from "react";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import type { User } from "@supabase/supabase-js"; // Import User type

/* ============================================================
   📌 Tipagem do Contexto Global
============================================================ */
export interface UserTenantContextType {
  user: User | null; // Use Supabase User type
  profile: any;
  tenant: any;
  subscription: any;
  plan: any;
  features: string[];
  permissions: string[];
  loading: boolean;
  needsSetup: boolean;

  refreshProfile: () => Promise<void>;
  refreshTenant: () => Promise<void>;
  reloadAll: () => Promise<void>;
}

/* ============================================================
   📌 Criação do Contexto
============================================================ */
const UserTenantContext = createContext<UserTenantContextType | null>(null);

/* ============================================================
   📌 Provider
============================================================ */
export function UserTenantProvider({ children }: { children: ReactNode }) {
  const {
    user, // This `user` now comes from `useUserAndTenant` which gets it from `useAuth`
    profile,
    tenant,
    subscription,
    plan,
    features,
    permissions,
    loading,
    needsSetup,
    refreshProfile, // This is the function returned by useUserAndTenant
  } = useUserAndTenant();

  /* ============================================================
     1️⃣ refreshTenant — recarrega somente o tenant
     (simplesmente chamamos refreshProfile, ele recarrega tenant também)
  ============================================================ */
  const refreshTenant = async () => {
    await refreshProfile();
  };

  /* ============================================================
     2️⃣ reloadAll — recarrega tudo em ordem
  ============================================================ */
  const reloadAll = async () => {
    await refreshProfile();
  };

  /* ============================================================
     Memo do valor exposto
  ============================================================ */
  const value = useMemo<UserTenantContextType>(
    () => ({
      user,
      profile,
      tenant,
      subscription,
      plan,
      features,
      permissions,
      loading,
      needsSetup,

      refreshProfile, // Directly use the function from the hook
      refreshTenant,
      reloadAll,
    }),
    [
      user,
      profile,
      tenant,
      subscription,
      plan,
      features,
      permissions,
      loading,
      needsSetup,
      refreshProfile, // Add refreshProfile to dependencies
    ]
  );

  return (
    <UserTenantContext.Provider value={value}>
      {children}
    </UserTenantContext.Provider>
  );
}

/* ============================================================
   📌 Hook de Acesso
============================================================ */
export function useUserTenant() {
  const ctx = useContext(UserTenantContext);
  if (!ctx) {
    throw new Error(
      "useUserTenant deve ser usado dentro de <UserTenantProvider>"
    );
  }
  return ctx;
}