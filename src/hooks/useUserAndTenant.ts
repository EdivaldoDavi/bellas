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
     🔥 Recarregar Profile + Tenant (agora é a única função de recarga)
  ============================================================ */
  const refreshProfile = useCallback(async () => {
    console.log("useUserAndTenant: [refreshProfile] Função chamada.");
    setLoading(true); // Set loading true at the very beginning
    setError(null);
    setInternalProfessionalId(null); // Limpa antes de tentar buscar novamente

    try {
      const currentUser = authUser;

      if (!currentUser) {
        console.log("useUserAndTenant: Nenhum usuário autenticado → limpando tudo");
        clearAll();
        return;
      }

      console.log("useUserAndTenant: Usuário atual:", currentUser.id);

      /* ================ PROFILE ================ */
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!pData) {
        console.log("useUserAndTenant: Perfil não encontrado → limpando");
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

      // Always set a new profile object if the content is different
      setProfile((prev) => {
        // Deep comparison to avoid unnecessary re-renders if content is truly identical
        if (JSON.stringify(prev) === JSON.stringify(newProfile)) {
          console.log("useUserAndTenant: setProfile - Profile content is identical, skipping update.");
          return prev;
        }
        console.log("useUserAndTenant: setProfile - Profile updated to", newProfile);
        return newProfile;
      });

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
        console.log("useUserAndTenant: Professional ID set to:", currentProfessionalId);
      } else {
        setInternalProfessionalId(null);
        console.log("useUserAndTenant: No tenant, professional_id set to null.");
      }

      /* ================ SEM TENANT ================ */
      if (!newProfile.tenant_id) {
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        console.log("useUserAndTenant: No tenant_id found for profile.");
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
        console.warn("useUserAndTenant: Tenant não encontrado → limpando tenant");
        setTenant(null);
        return;
      }

      setTenant((prevTenant) => {
        const equal = JSON.stringify(prevTenant) === JSON.stringify(tData);
        if (!equal) {
          console.log("useUserAndTenant: Tenant updated to", tData);
        }
        return equal ? prevTenant : tData;
      });

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
        .eq("tenant_id", newProfile.tenant_id)
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
      console.log("useUserAndTenant: [refreshProfile] Finalizado. Loading =", false);
    }
  }, [authUser, clearAll]);

  /* ============================================================
     🔄 Load inicial
  ============================================================ */
  useEffect(() => {
    console.log("useUserAndTenant: useEffect for initial load triggered. authUser =", authUser?.id, "authLoading =", authLoading);
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
    const fullProfile = { ...profile, professional_id: internalProfessionalId };
    console.log("useUserAndTenant: Memoized Profile (with professional_id) =", fullProfile);
    return fullProfile;
  }, [profile, internalProfessionalId]);

  return {
  loading,
  error,
  user: authUser,
  profile: memoizedProfile, // <-- Adicionado aqui
  tenant,
  subscription,
  plan,
  features,
  permissions,
  needsSetup,
  memoizedProfile, // <-- Adicionado aqui para ser retornado pelo hook

  refreshProfile,
  reloadAll: refreshProfile // reloadAll now just calls refreshProfile
};
}