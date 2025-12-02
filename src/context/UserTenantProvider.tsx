import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
  useState,
  useEffect,
  useCallback,
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
    refreshTenant: refreshTenantFromHook,
  } = useUserAndTenant();

  /* ============================================================
     🔥 Estado REAL do tenant (evita piscar/loop)
  ============================================================ */
  const [tenantState, setTenantState] = useState<Tenant | null>(tenant);

  useEffect(() => {
    setTenantState(tenant);
  }, [tenant]);

  /* ============================================================
     🔄 Recarregar APENAS o tenant
     (corrigido — agora usa refreshTenantFromHook)
  ============================================================ */
  const refreshTenant = useCallback(async () => {
    await refreshTenantFromHook(); // ← Hook já faz tudo corretamente
  }, [refreshTenantFromHook]);

  /* ============================================================
     ✔ Atualizar onboarding_step de forma segura
  ============================================================ */
  const updateOnboardingStep = useCallback(
    async (step: number) => {
      if (!tenantState?.id) return;

      const { error } = await supabase
        .from("tenants")
        .update({ onboarding_step: step })
        .eq("id", tenantState.id);

      if (error) {
        console.error("Erro ao atualizar onboarding_step:", error);
        return;
      }

      // Recarrega tenant após atualizar
      await refreshTenant();
    },
    [tenantState?.id, refreshTenant]
  );

  /* ============================================================
     🔄 Recarregar TUDO (Profile + Tenant)
  ============================================================ */
  const reloadAll = useCallback(async () => {
    await refreshProfile();
    await refreshTenant();
  }, [refreshProfile, refreshTenant]);

  /* ============================================================
     📦 Memoização dos valores expostos
  ============================================================ */
  const value = useMemo<UserTenantContextType>(
    () => ({
      user,
      profile,
      tenant: tenantState, // sempre estável
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
      refreshProfile,
      refreshTenant,
      reloadAll,
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
   📌 Hook de acesso
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
