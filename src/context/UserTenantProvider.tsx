import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
  useState,
  useEffect,
} from "react";

import {
  useUserAndTenant,
  type Profile,
  type Tenant,
} from "../hooks/useUserAndTenant";

import { supabase } from "../lib/supabaseCleint";

/* ============================================================
   📌 Tipagem do Contexto Global
============================================================ */
export interface UserTenantContextType {
  user: any;
  profile: Profile | null;
  tenant: Tenant | null;   // ← Agora vem do tenantState
  subscription: any;
  plan: any;
  features: string[];
  permissions: string[];
  loading: boolean;
  needsSetup: boolean | null;

  refreshProfile: () => Promise<void>;
  refreshTenant: () => Promise<void>;
  reloadAll: () => Promise<void>;

  updateOnboardingStep: (step: number) => Promise<void>;
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
     🔥 Estado REAL do Tenant (corrige o loop)
  ============================================================ */
  const [tenantState, setTenantState] = useState<Tenant | null>(tenant);

  // Mantém tenantState sincronizado com o hook inicial
  useEffect(() => {
    setTenantState(tenant);
  }, [tenant]);

  /* ============================================================
     🔄 Recarregar apenas o tenant
  ============================================================ */
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

    if (error) {
      console.error("Erro ao recarregar tenant:", error);
      return;
    }

    setTenantState(data);
  };

  /* ============================================================
     🧭 Atualizar onboarding_step
  ============================================================ */
  const updateOnboardingStep = async (step: number) => {
    if (!tenantState?.id) return;

    const { error } = await supabase
      .from("tenants")
      .update({ onboarding_step: step })
      .eq("id", tenantState.id);

    if (!error) {
      await refreshTenant();
    } else {
      console.error("Erro ao atualizar onboarding_step:", error);
    }
  };

  /* ============================================================
     🔄 Recarrega tudo
  ============================================================ */
  const reloadAll = async () => {
    await refreshProfile();
    await refreshTenant();
  };

  /* ============================================================
     📦 Memoização
  ============================================================ */
  const value = useMemo<UserTenantContextType>(
    () => ({
      user,
      profile,
      tenant: tenantState, // ← Agora usa o estado REAL
      subscription,
      plan,
      features,
      permissions,
      loading,

      needsSetup,

      refreshProfile,
      refreshTenant,
      reloadAll,
      updateOnboardingStep,
    }),
    [
      user,
      profile,
      tenantState,
      subscription,
      plan,
      features,
      permissions,
      loading,
      needsSetup,
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
