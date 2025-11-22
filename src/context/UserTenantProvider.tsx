import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
} from "react";
import { useUserAndTenant, type Profile, type Tenant } from "../hooks/useUserAndTenant"; // Importar Profile e Tenant

/* ============================================================
   📌 Tipagem do Contexto Global
============================================================ */
export interface UserTenantContextType {
  user: any;                          // tipado pelo Supabase (via useUserAndTenant)
  profile: Profile | null;            // Usar o tipo Profile atualizado
  tenant: Tenant | null;              // Usar o tipo Tenant
  subscription: any;
  plan: any;
  features: string[];
  permissions: string[];
  loading: boolean;
  needsSetup: boolean | null;         // CORRIGIDO ✔

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
    refreshProfile,
  } = useUserAndTenant();

  /* ============================================================
      Recarrega apenas o tenant
  ============================================================ */
  const refreshTenant = async () => {
    await refreshProfile();
  };

  /* ============================================================
      Recarrega tudo
  ============================================================ */
  const reloadAll = async () => {
    await refreshProfile();
  };

  /* ============================================================
      Memo — evita recriação desnecessária
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

      // needsSetup pode vir como boolean | null → mantemos assim
      needsSetup,

      refreshProfile,
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
      refreshProfile,
    ]
  );

  return (
    <UserTenantContext.Provider value={value}>
      {children}
    </UserTenantContext.Provider>
  );
}

/* ============================================================
   📌 Hook de Acesso ao Contexto
============================================================ */
export function useUserTenant() {
  const ctx = useContext(UserTenantContext);
  if (!ctx) {
    throw new Error("useUserTenant deve ser usado dentro de <UserTenantProvider>");
  }
  return ctx;
}