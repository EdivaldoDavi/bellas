// src/context/UserTenantProvider.tsx
import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
} from "react";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

export interface UserTenantContextType {
  user: any;
  profile: any;
  tenant: any;
  subscription: any;
  loading: boolean;
  needsSetup: boolean;

  // Métodos que serão usados globalmente
  refreshProfile: () => Promise<void>;
  refreshTenant: () => Promise<void>;
  reloadAll: () => Promise<void>;
}

const UserTenantContext = createContext<UserTenantContextType | null>(null);

export function UserTenantProvider({ children }: { children: ReactNode }) {
  // 🔥 Hook executa apenas 1x aqui
  const {
    user,
    profile,
    tenant,
    subscription,
    loading,
    needsSetup,
    reloadProfile,
    reloadTenant,
    reloadAll,
  } = useUserAndTenant();

  // 🔥 Memoizado para evitar renders desnecessários
  const value = useMemo<UserTenantContextType>(
    () => ({
      user,
      profile,
      tenant,
      subscription,
      loading,
      needsSetup,

      // Expor métodos globalmente
      refreshProfile: reloadProfile,
      refreshTenant: reloadTenant,
      reloadAll,
    }),
    [
      user,
      profile,
      tenant,
      subscription,
      loading,
      needsSetup,
      reloadProfile,
      reloadTenant,
      reloadAll,
    ]
  );

  return (
    <UserTenantContext.Provider value={value}>
      {children}
    </UserTenantContext.Provider>
  );
}

export function useUserTenant() {
  const ctx = useContext(UserTenantContext);
  if (!ctx) {
    throw new Error(
      "useUserTenant deve ser usado dentro de <UserTenantProvider>"
    );
  }
  return ctx;
}
