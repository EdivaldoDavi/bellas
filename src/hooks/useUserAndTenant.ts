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
     🔥 Recarregar Profile + Tenant
  ============================================================ */
  const refreshProfile = useCallback(async () => {
    console.log("useUserAndTenant: [refreshProfile] Função chamada.");
    setLoading(true);
    setError(null);
    setInternalProfessionalId(null);

    try {
      const currentUser = authUser;

      if (!currentUser) {
        console.log("Nenhum usuário autenticado → limpando tudo");
        clearAll();
        return;
      }

      console.log("Usuário atual:", currentUser.id);

      /* ================ PROFILE ================ */
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!pData) {
        console.log("Perfil não encontrado → limpando");
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
        if (equal) return prev;
        return baseProfile;
      });

      /* ================ PROFESSIONAL_ID ================ */
      if (baseProfile.role === "professional" && baseProfile.tenant_id) {
        const { data: professionalEntry, error: profErr } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("tenant_id", baseProfile.tenant_id)
          .maybeSingle();

        if (profErr) {
          console.error("Erro ao buscar professional_id:", profErr);
        }

        setInternalProfessionalId(professionalEntry?.id ?? null);
      } else {
        setInternalProfessionalId(null);
      }

      /* ================ SEM TENANT ================ */
      if (!baseProfile.tenant_id) {
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
        .eq("id", baseProfile.tenant_id)
        .maybeSingle();

      if (tErr) throw tErr;

      if (!tData) {
        console.warn("Tenant não encontrado → limpando tenant");
        setTenant(null);
        return;
      }

      setTenant((prevTenant) => {
        const equal = JSON.stringify(prevTenant) === JSON.stringify(tData);
        return equal ? prevTenant : tData;
      });

      /* ================ SUBSCRIPTION ================ */
      /* ================ SUBSCRIPTIONS (CORRETO) ================ */
          const { data: subs, error: subErr } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("tenant_id", tData.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (subErr) console.error("Erro ao buscar assinatura:", subErr);

          const latestSub = subs?.[0] ?? null;
          setSubscription(latestSub);


      /* ================ PLAN + FEATURES ================ */
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

        const enabledFeatures =
          feats?.filter((f) => f.enabled).map((f) => f.feature_key) ?? [];

        setFeatures(enabledFeatures);
      } else {
        setPlan(null);
        setFeatures([]);
      }

      /* ================ PERMISSIONS ================ */
      const { data: perms } = await supabase
        .from("permissions")
        .select("permission_key, allowed")
        .eq("tenant_id", baseProfile.tenant_id)
        .eq("user_id", currentUser.id);

      const allowedPermissions =
        perms?.filter((p) => p.allowed).map((p) => p.permission_key) ?? [];

      setPermissions(allowedPermissions);
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
    (profile.role === "owner" ||
      profile.role === "manager" ||
      profile.role === "professional") &&
    window.location.pathname !== "/force-reset";

  /* ============================================================
     🔁 Memo profile completo
  ============================================================ */
  const memoizedProfile = useMemo(() => {
    if (!profile) return null;
    return { ...profile, professional_id: internalProfessionalId };
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

  refreshProfile,
  refreshTenant: refreshProfile,  // <-- remove o refreshTenant duplicado
  reloadAll: async () => {
    await refreshProfile();
  }
};
};