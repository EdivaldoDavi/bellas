// src/context/UserTenantProvider.tsx
import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
} from "react";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

/* ============================================================
   📌 Tipagem do Contexto Global
============================================================ */
export interface UserTenantContextType {
  user: any;
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
    user,
    profile,
    tenant,
    subscription,
    plan,
    features,
    permissions,
    loading,
    needsSetup,
    reloadProfile,
  } = useUserAndTenant();

  /* ============================================================
     1️⃣ refreshTenant — recarrega somente o tenant
     (simplesmente chamamos reloadProfile, ele recarrega tenant também)
  ============================================================ */
  const refreshTenant = async () => {
    await reloadProfile();
  };

  /* ============================================================
     2️⃣ reloadAll — recarrega tudo em ordem
  ============================================================ */
  const reloadAll = async () => {
    await reloadProfile();
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

      refreshProfile: reloadProfile,
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
      reloadProfile,
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
