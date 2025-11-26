import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { useUserAndTenant, type Profile, type Tenant } from "../hooks/useUserAndTenant"; // Importar Profile e Tenant

import { supabase } from "../lib/supabaseCleint";
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
    updateOnboardingStep: (step: number) => Promise<void>;
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
  const [, setTenantState] = useState<Tenant | null>(tenant);

const refreshTenant = async () => {
  if (!profile?.tenant_id) {
    setTenantState(null);
    return;
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  if (!error) {
    setTenantState(data);
  } else {
    console.error("Erro ao recarregar tenant", error);
  }
};

// 🔹 Função para atualizar o passo do onboarding
  const updateOnboardingStep = async (step: number) => {
    if (!tenant?.id) return;

    const { error } = await supabase
      .from("tenants")
      .update({ onboarding_step: step })
      .eq("id", tenant.id);

    if (!error) {
      await refreshTenant();
    } else {
      console.error("Erro ao atualizar onboarding_step:", error);
    }
  };

  /* ============================================================
      Recarrega tudo
  ============================================================ */
const reloadAll = async () => {
  await refreshProfile();
  await refreshTenant();
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
      updateOnboardingStep,
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
      updateOnboardingStep,
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