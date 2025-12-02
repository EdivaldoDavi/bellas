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

  /* ============================================================
     🧹 Limpa tudo
  ============================================================ */
  const clearAll = useCallback(() => {
    console.log("useUserAndTenant: [clearAll] Limpando todos os estados.");
    setProfile(null);
    setTenant(null);
    setSubscription(null);
    setPlan(null);
    setFeatures([]);
    setPermissions([]);
    setInternalProfessionalId(null);
  }, []);

  /* ============================================================
     🔥 Recarregar SOMENTE o Tenant
  ============================================================ */
  const refreshTenant = useCallback(async () => {
    if (!profile?.tenant_id) {
      setTenant(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao recarregar tenant:", error);
        return;
      }

      if (data) {
        setTenant((prev) => {
          const equal = JSON.stringify(prev) === JSON.stringify(data);
          return equal ? prev : data;
        });
      }
    } catch (e) {
      console.error("refreshTenant ERROR:", e);
    }
  }, [profile?.tenant_id]);

  /* ============================================================
     🔥 Recarregar Profile + Tenant + Permissions + Subscriptions
  ============================================================ */
  const refreshProfile = useCallback(async () => {
    console.log("useUserAndTenant: [refreshProfile] Função chamada.");
    setLoading(true);
    setError(null);
    setInternalProfessionalId(null);

    try {
      const currentUser = authUser;

      if (!currentUser) {
        clearAll();
        return;
      }

      /* PROFILE */
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!pData) {
        clearAll();
        return;
      }

      const baseProfile: Omit<Profile, "professional_id"> = {
        user_id: currentUser.id,
        email: currentUser.email,
        role: pData.role,
        full_name: pData.full_name,
        avatar_url: pData.avatar_url,
        tenant_id: pData.tenant_id,
      };

      setProfile((prev) => {
        const equal = JSON.stringify(prev) === JSON.stringify(baseProfile);
        return equal ? prev : baseProfile;
      });

      /* PROFESSIONAL_ID */
      if (baseProfile.role === "professional" && baseProfile.tenant_id) {
        const { data: professionalEntry } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("tenant_id", baseProfile.tenant_id)
          .maybeSingle();

        setInternalProfessionalId(professionalEntry?.id ?? null);
      } else {
        setInternalProfessionalId(null);
      }

      /* SEM TENANT */
      if (!baseProfile.tenant_id) {
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        return;
      }

      /* TENANT */
      const { data: tData, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", baseProfile.tenant_id)
        .maybeSingle();

      if (tErr) throw tErr;

      setTenant(tData ?? null);

      /* SUBSCRIPTION */
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tData.id)
        .order("created_at", { ascending: false })
        .limit(1);

      setSubscription(subs?.[0] ?? null);

      /* PLAN + FEATURES */
      if (tData.plan_id) {
        const { data: planData } = await supabase
          .from("plans")
          .select("*")
          .eq("id", tData.plan_id)
          .maybeSingle();

        setPlan(planData ?? null);

        const { data: feats } = await supabase
          .from("plan_features")
          .select("feature_key, enabled")
          .eq("plan_id", tData.plan_id);

        setFeatures(
          feats?.filter((f) => f.enabled).map((f) => f.feature_key) ?? []
        );
      } else {
        setPlan(null);
        setFeatures([]);
      }

      /* PERMISSIONS */
      const { data: perms } = await supabase
        .from("permissions")
        .select("permission_key, allowed")
        .eq("tenant_id", baseProfile.tenant_id)
        .eq("user_id", currentUser.id);

      setPermissions(
        perms?.filter((p) => p.allowed).map((p) => p.permission_key) ?? []
      );

    } catch (err: any) {
      console.error("useUserAndTenant: erro ao carregar", err);
      setError(err.message ?? "Erro ao carregar dados.");
      clearAll();
    } finally {
      setLoading(false);
    }
  }, [authUser, clearAll]);

  /* ============================================================
     🔄 Load inicial
  ============================================================ */
  useEffect(() => {
    if (!authLoading) refreshProfile();
  }, [authUser, authLoading, refreshProfile]);

  /* ============================================================
     🎯 needsSetup
  ============================================================ */
  const needsSetup =
    !loading &&
    authUser &&
    profile &&
    !tenant &&
    ["owner", "manager", "professional"].includes(profile.role || "") &&
    window.location.pathname !== "/force-reset";

  /* ============================================================
     🔁 Memo profile completo
  ============================================================ */
  const memoizedProfile = useMemo(() => {
    if (!profile) return null;
    return { ...profile, professional_id: internalProfessionalId };
  }, [profile, internalProfessionalId]);

  /* ============================================================
     🔄 reloadAll (Profile + Tenant)
  ============================================================ */
  const reloadAll = useCallback(async () => {
    await refreshProfile();
    await refreshTenant();
  }, [refreshProfile, refreshTenant]);

  /* ============================================================
     📦 Retorno FINAL do Hook
  ============================================================ */
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
    refreshProfile,
    refreshTenant,
    reloadAll,
  };
}
