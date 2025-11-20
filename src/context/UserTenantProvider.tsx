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

  // Métodos globais
  refreshProfile: () => Promise<void>;
}

/* ============================================================
   📌 Criação do Contexto
============================================================ */
const UserTenantContext = createContext<UserTenantContextType | null>(null);

/* ============================================================
   📌 Provider
============================================================ */
export function UserTenantProvider({ children }: { children: ReactNode }) {
  // Hook centralizado que carrega tudo (user, profile, tenant, etc)
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

  // Memo evita re-render desnecessário da aplicação inteira
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

      // Expor método principal
      refreshProfile: reloadProfile,
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
