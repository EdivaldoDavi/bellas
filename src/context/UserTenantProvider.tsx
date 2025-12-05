import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
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
  tenant: Tenant | null;
  subscription: any;
  plan: any;
  features: string[];
  permissions: string[];
  loading: boolean;
  needsSetup: boolean | null;

  refreshProfile: () => Promise<void>;
  reloadAll: () => Promise<void>;

  updateOnboardingStep: (step: number) => Promise<void>;
  updateProfileLocally: (partial: Partial<Profile>) => void;
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
    tenant: tenantFromHook,
    subscription,
    plan,
    features,
    permissions,
    loading,
    needsSetup,
    refreshProfile,
    memoizedProfile, 
    setTenantOnboardingStep,
    updateProfileLocal
  } = useUserAndTenant();

  /* ============================================================
     🎯 Atualizar onboarding_step (agora funciona SEM refresh manual)
  ============================================================ */
  const updateOnboardingStep = async (step: number) => {
    if (!tenantFromHook?.id) return;

    const { error } = await supabase
      .from("tenants")
      .update({ onboarding_step: step })
      .eq("id", tenantFromHook.id);

    if (error) {
      console.error("Erro ao atualizar onboarding_step:", error);
      return;
    }

    // Atualiza localmente sem disparar loading global
    setTenantOnboardingStep(step);
  };

  /* Atualização otimista do perfil (ex.: full_name) */
  const updateProfileLocally = (partial: Partial<Profile>) => {
    const { professional_id, ...rest } = partial as any;
    updateProfileLocal(rest);
  };

  /* ============================================================
     🔄 Recarregar tudo
  ============================================================ */
  const reloadAll = async () => {
    await refreshProfile();
  };

  /* ============================================================
     📦 Memo Final
  ============================================================ */
  const value = useMemo<UserTenantContextType>(
    () => ({
      user,
      profile: memoizedProfile,
      tenant: tenantFromHook,
      subscription,
      plan,
      features,
      permissions,
      loading,
      needsSetup,

      refreshProfile,
      reloadAll,
      updateOnboardingStep,
      updateProfileLocally,
    }),
    [
      user,
      memoizedProfile,
      tenantFromHook,
      subscription,
      plan,
      features,
      permissions,
      loading,
      needsSetup,
      refreshProfile,
      reloadAll,
      updateOnboardingStep,
      updateProfileLocally,
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