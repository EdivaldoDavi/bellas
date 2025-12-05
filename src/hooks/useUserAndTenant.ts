import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useAuth } from "../context/AuthProvider";

/* ============================================================
   📌 Tipos
============================================================ */
export type Profile = {
  user_id: string;
  email: string | undefined;
  role: "owner" | "manager" | "professional" | "staff" | "client" | null;
  full_name: string;
  avatar_url: string | null;
  tenant_id: string | null;
  professional_id: string | null;
};

export type Tenant = {
  id: string;
  name: string;
  theme_variant: "light" | "dark";
  primary_color: string;
  secondary_color: string;
  setup_complete: boolean;
  plan_id: string | null;
  whatsapp_number: string | null;
   onboarding_step: number; 
};

/* ============================================================
   📌 Hook principal
============================================================ */
export function useUserAndTenant() {
  const { user: authUser, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] =
    useState<Omit<Profile, "professional_id"> | null>(null);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [internalProfessionalId, setInternalProfessionalId] = useState<
    string | null
  >(null);

  // Atualiza localmente o onboarding_step para evitar flicker de loading
  const setTenantOnboardingStep = useCallback((step: number) => {
    setTenant((prev) => (prev ? { ...prev, onboarding_step: step } : prev));
  }, []);

  // Atualização otimista do perfil (não dispara loading global)
  const updateProfileLocal = useCallback(
    (partial: Partial<Omit<Profile, "professional_id">>) => {
      setProfile((prev) => (prev ? { ...prev, ...partial } : prev));
    },
    []
  );

  /* ============================================================
     🧹 Limpa tudo
  ============================================================ */
  const clearAll = useCallback(() => {
    console.log("useUserAndTenant: clearAll called.");
    setProfile(null);
    setTenant(null);
    setSubscription(null);
    setPlan(null);
    setFeatures([]);
    setPermissions([]);
    setInternalProfessionalId(null);
  }, []);

  /* ============================================================
     🔥 Recarregar Profile + Tenant (agora é a única função de recarga)
  ============================================================ */
  const refreshProfile = useCallback(async () => {
    console.log("useUserAndTenant: refreshProfile started.");
    setLoading(true); // Set loading true at the very beginning
    setError(null);
    setInternalProfessionalId(null); // Limpa antes de tentar buscar novamente

    try {
      const currentUser = authUser;

      if (!currentUser) {
        console.log("useUserAndTenant: No current user, clearing all.");
        clearAll();
        return;
      }

      /* ================ PROFILE ================ */
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url", { head: false })
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!pData) {
        console.log("useUserAndTenant: No profile data found, clearing all.");
        clearAll();
        return;
      }

      // Construct the new profile object
      const newProfile: Omit<Profile, "professional_id"> = {
        user_id: currentUser.id,
        email: currentUser.email, // Sempre pega o email do authUser
        role: pData.role,
        full_name: pData.full_name,
        avatar_url: pData.avatar_url,
        tenant_id: pData.tenant_id,
      };

      // Simplificado: sempre define o novo objeto de perfil para garantir a atualização da referência
      setProfile(newProfile);
      console.log("useUserAndTenant: Profile updated:", newProfile);


      /* ================ PROFESSIONAL_ID ================ */
      let currentProfessionalId: string | null = null;
      // Sempre tenta buscar o professional_id se houver um tenant_id,
      // pois o manager/owner também pode ser um profissional.
      if (newProfile.tenant_id) { 
        const { data: professionalEntry, error: profErr } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("tenant_id", newProfile.tenant_id)
          .maybeSingle();

        if (profErr) {
          console.error("useUserAndTenant: Erro ao buscar professional_id:", profErr);
        }
        currentProfessionalId = professionalEntry?.id ?? null;
        setInternalProfessionalId(currentProfessionalId);
        console.log("useUserAndTenant: Professional ID updated:", currentProfessionalId);
      } else {
        setInternalProfessionalId(null);
        console.log("useUserAndTenant: No tenant_id, professional ID cleared.");
      }

      /* ================ SEM TENANT ================ */
      if (!newProfile.tenant_id) {
        console.log("useUserAndTenant: No tenant_id in profile, clearing tenant related states.");
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        return;
      }

      /* ================ TENANT ================ */
      const { data: tData, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", newProfile.tenant_id)
        .maybeSingle();

      if (tErr) throw tErr;

      if (!tData) {
        console.log("useUserAndTenant: No tenant data found.");
        setTenant(null);
        return;
      }

      // 🔥 REMOVIDA A OTIMIZAÇÃO: SEMPRE DEFINE UMA NOVA REFERÊNCIA
      setTenant(tData);
      console.log("useUserAndTenant: Tenant updated:", tData);


      /* ================ SUBSCRIPTION ================ */
      const { data: subs, error: subErr } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tData.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (subErr) console.error("useUserAndTenant: Erro ao buscar assinatura:", subErr);

      const latestSub = subs?.[0] ?? null;
      setSubscription(latestSub);
      console.log("useUserAndTenant: Subscription updated:", latestSub);


      /* ================ PLAN + FEATURES ================ */
      if (tData.plan_id) {
        const { data: planData } = await supabase
          .from("plans")
          .select("*")
          .eq("id", tData.plan_id)
          .maybeSingle();

        setPlan(planData ?? null);
        console.log("useUserAndTenant: Plan updated:", planData);


        const { data: feats } = await supabase
          .from("plan_features")
          .select("feature_key, enabled")
          .eq("plan_id", tData.plan_id);

        const enabledFeatures =
          feats?.filter((f) => f.enabled).map((f) => f.feature_key) ?? [];

        setFeatures(enabledFeatures);
        console.log("useUserAndTenant: Features updated:", enabledFeatures);

      } else {
        setPlan(null);
        setFeatures([]);
        console.log("useUserAndTenant: No plan_id, plan and features cleared.");
      }

      /* ================ PERMISSIONS ================ */
      const { data: perms } = await supabase
        .from("permissions")
        .select("permission_key, allowed") 
        .eq("tenant_id", newProfile.tenant_id)
        .eq("user_id", currentUser.id);

      const allowedPermissions =
        perms?.filter((p) => p.allowed).map((p) => p.permission_key) ?? []; // <-- CORRIGIDO AQUI: de feature_key para permission_key

      setPermissions(allowedPermissions);
      console.log("useUserAndTenant: Permissions updated:", allowedPermissions);

    } catch (err: any) {
      console.error("useUserAndTenant: erro ao carregar", err);
      setError(err.message ?? "Erro ao carregar dados.");
      clearAll();
    } finally {
      setLoading(false);
      console.log("useUserAndTenant: refreshProfile finished. Loading set to false.");
    }
  }, [authUser, clearAll]);

  /* ============================================================
     🔄 Load inicial
  ============================================================ */
  useEffect(() => {
    if (!authLoading) {
      console.log("useUserAndTenant: Initial load effect triggered (authLoading is false).");
      refreshProfile();
    }
  }, [authUser, authLoading, refreshProfile]);

  /* ============================================================
     🎯 needsSetup
  ============================================================ */
  const needsSetup =
    !loading &&
    authUser &&
    profile &&
    !tenant && // <--- This is the key condition
    (profile.role === "owner" ||
      profile.role === "manager" ||
      profile.role === "professional");
    // 🔥 REMOVIDO: window.location.pathname !== "/force-reset"; // <--- This check is too late

  /* ============================================================
     🔁 Memo profile completo
  ============================================================ */
  const memoizedProfile = useMemo(() => {
    if (!profile) return null;
    const fullProfile = { ...profile, professional_id: internalProfessionalId };
    console.log("useUserAndTenant: memoizedProfile recomputed.");
    return fullProfile;
  }, [profile, internalProfessionalId]);

  return {
    loading,
    error,
    user: authUser,
    profile: memoizedProfile,
    tenant,
    subscription,
    plan,
    features,
    permissions,
    needsSetup,
    memoizedProfile,

    refreshProfile,
    reloadAll: refreshProfile,
    setTenantOnboardingStep,
    updateProfileLocal
  };
}