import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useAuth } from "../context/AuthProvider"; // Import useAuth

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
};

/* ============================================================
   📌 Hook principal
============================================================ */
export function useUserAndTenant() {
  const { user: authUser, loading: authLoading } = useAuth(); // Get user from AuthProvider

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  // 🔥 NOVO: Estado separado para professional_id, não parte do Profile
  const [professionalId, setProfessionalId] = useState<string | null>(null);


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
    setProfessionalId(null); // Limpa também o professionalId
  }, []);

  /* ============================================================
     🔥 Recarregar Profile + Tenant
  ============================================================ */
  const refreshProfile = useCallback(async () => {
    console.log("useUserAndTenant: [refreshProfile] Função chamada.");
    setLoading(true);
    setError(null);
    setProfessionalId(null); // Limpa antes de tentar carregar

    try {
      const currentUser = authUser;

      if (!currentUser) {
        console.log("useUserAndTenant: [refreshProfile] Nenhum usuário autenticado, limpando tudo.");
        clearAll();
        return;
      }
      console.log("useUserAndTenant: [refreshProfile] Usuário atual:", currentUser.id);

      // PROFILE
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!pData) {
        console.log("useUserAndTenant: [refreshProfile] Perfil não encontrado para o usuário, limpando tudo.");
        clearAll();
        return;
      }

      const finalProfile: Profile = {
        user_id: currentUser.id,
        email: currentUser.email,
        role: pData.role,
        full_name: pData.full_name,
        avatar_url: pData.avatar_url,
        tenant_id: pData.tenant_id,
      };

      setProfile(prevProfile => {
        const areEqual = JSON.stringify(prevProfile) === JSON.stringify(finalProfile);
        console.log("useUserAndTenant: [setProfile] Comparando prevProfile vs finalProfile:", { prev: prevProfile, new: finalProfile, areEqual });
        if (areEqual) {
          console.log("useUserAndTenant: [setProfile] Perfil inalterado, evitando re-render.");
          return prevProfile;
        }
        console.log("useUserAndTenant: [setProfile] Atualizando perfil para:", finalProfile);
        return finalProfile;
      });

      // PROFESSIONAL ID
      if (finalProfile.role === "professional" && finalProfile.tenant_id) {
        const { data: professionalEntry, error: profEntryError } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("tenant_id", finalProfile.tenant_id)
          .maybeSingle();

        if (profEntryError) {
          console.error("useUserAndTenant: [refreshProfile] Erro ao buscar entrada de profissional:", profEntryError);
        } else if (professionalEntry) {
          setProfessionalId(prevId => {
            const areEqual = prevId === professionalEntry.id;
            console.log("useUserAndTenant: [setProfessionalId] Comparando prevId vs professionalEntry.id:", { prev: prevId, new: professionalEntry.id, areEqual });
            if (areEqual) {
              console.log("useUserAndTenant: [setProfessionalId] ID do profissional inalterado, evitando re-render.");
              return prevId;
            }
            console.log("useUserAndTenant: [setProfessionalId] Atualizando professionalId para:", professionalEntry.id);
            return professionalEntry.id;
          });
        } else {
          setProfessionalId(null);
          console.log("useUserAndTenant: [setProfessionalId] Nenhum professionalId encontrado, definindo como null.");
        }
      } else {
        setProfessionalId(null);
        console.log("useUserAndTenant: [setProfessionalId] Não é profissional ou sem tenant, definindo como null.");
      }

      // SEM TENANT_ID NO PERFIL
      if (!finalProfile.tenant_id) {
        console.log("useUserAndTenant: [refreshProfile] Perfil sem tenant_id, limpando estados relacionados ao tenant.");
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        return;
      }

      // TENANT
      const { data: tData, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", finalProfile.tenant_id)
        .maybeSingle();

      if (tErr) throw tErr;

      if (!tData) {
        console.warn(`useUserAndTenant: [refreshProfile] Tenant com ID ${finalProfile.tenant_id} não encontrado ou inacessível. Limpando dados do tenant.`);
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        return;
      }

      setTenant(prevTenant => {
        const areEqual = JSON.stringify(prevTenant) === JSON.stringify(tData);
        console.log("useUserAndTenant: [setTenant] Comparando prevTenant vs tData:", { prev: prevTenant, new: tData, areEqual });
        if (areEqual) {
          console.log("useUserAndTenant: [setTenant] Tenant inalterado, evitando re-render.");
          return prevTenant;
        }
        console.log("useUserAndTenant: [setTenant] Atualizando tenant para:", tData);
        return tData;
      });

      // SUBSCRIPTION
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tData?.id)
        .maybeSingle();

      setSubscription((prevSub: any | null) => {
        const areEqual = JSON.stringify(prevSub) === JSON.stringify(sub);
        console.log("useUserAndTenant: [setSubscription] Comparando prevSub vs sub:", { prev: prevSub, new: sub, areEqual });
        if (areEqual) {
          console.log("useUserAndTenant: [setSubscription] Assinatura inalterada, evitando re-render.");
          return prevSub;
        }
        console.log("useUserAndTenant: [setSubscription] Atualizando assinatura para:", sub);
        return sub ?? null;
      });

      // PLAN + FEATURES
      if (tData?.plan_id) {
        const { data: planData } = await supabase
          .from("plans")
          .select("*")
          .eq("id", tData.plan_id)
          .maybeSingle();

        setPlan((prevPlan: any | null) => {
          const areEqual = JSON.stringify(prevPlan) === JSON.stringify(planData);
          console.log("useUserAndTenant: [setPlan] Comparando prevPlan vs planData:", { prev: prevPlan, new: planData, areEqual });
          if (areEqual) {
            console.log("useUserAndTenant: [setPlan] Plano inalterado, evitando re-render.");
            return prevPlan;
          }
          console.log("useUserAndTenant: [setPlan] Atualizando plano para:", planData);
          return planData ?? null;
        });

        const { data: feats } = await supabase
          .from("plan_features")
          .select("feature_key, enabled")
          .eq("plan_id", tData.plan_id);

        const newFeatures = (feats ?? []).filter((f) => f.enabled).map((f) => f.feature_key);
        setFeatures(prevFeatures => {
          const areEqual = JSON.stringify(prevFeatures) === JSON.stringify(newFeatures);
          console.log("useUserAndTenant: [setFeatures] Comparando prevFeatures vs newFeatures:", { prev: prevFeatures, new: newFeatures, areEqual });
          if (areEqual) {
            console.log("useUserAndTenant: [setFeatures] Features inalteradas, evitando re-render.");
            return prevFeatures;
          }
          console.log("useUserAndTenant: [setFeatures] Atualizando features para:", newFeatures);
          return newFeatures;
        });
      } else {
        setPlan(null);
        setFeatures([]);
        console.log("useUserAndTenant: [setPlan/setFeatures] Sem plan_id, definindo como null/vazio.");
      }

      // PERMISSIONS
      const { data: perms } = await supabase
        .from("permissions")
        .select("permission_key, allowed")
        .eq("tenant_id", finalProfile.tenant_id)
        .eq("user_id", currentUser.id);

      const newPermissions = (perms ?? []).filter((p) => p.allowed).map((p) => p.permission_key);
      setPermissions(prevPermissions => {
        const areEqual = JSON.stringify(prevPermissions) === JSON.stringify(newPermissions);
        console.log("useUserAndTenant: [setPermissions] Comparando prevPermissions vs newPermissions:", { prev: prevPermissions, new: newPermissions, areEqual });
        if (areEqual) {
          console.log("useUserAndTenant: [setPermissions] Permissões inalteradas, evitando re-render.");
          return prevPermissions;
        }
        console.log("useUserAndTenant: [setPermissions] Atualizando permissões para:", newPermissions);
        return newPermissions;
      });

    } catch (err: any) {
      console.error("useUserAndTenant: [refreshProfile] Erro ao carregar dados:", err);
      setError(err.message ?? "Erro ao carregar dados.");
      clearAll();
    } finally {
      console.log("useUserAndTenant: [refreshProfile] Finalizado. Definindo loading para false.");
      setLoading(false);
    }
  }, [clearAll, authUser]);

  // 🔹 Load inicial (agora depende de authUser e authLoading)
  useEffect(() => {
    console.log("useUserAndTenant: [useEffect principal] Disparado. authLoading:", authLoading, "authUser:", authUser?.id);
    if (!authLoading) {
      console.log("useUserAndTenant: [useEffect principal] AuthProvider terminou de carregar, chamando refreshProfile.");
      refreshProfile();
    }
  }, [authUser, authLoading, refreshProfile]);

  /* ============================================================
     🎯 needsSetup — owner/manager/professional sem tenant e sem force-reset
  ============================================================ */
  const needsSetup =
    !loading &&
    authUser &&
    profile &&
    !tenant &&
    (profile.role === "owner" || profile.role === "manager" || profile.role === "professional") &&
    window.location.pathname !== "/force-reset";

  return {
    loading,
    error,
    user: authUser,
    profile: profile ? { ...profile, professional_id: professionalId } : null,
    tenant,
    subscription,
    plan,
    features,
    permissions,
    needsSetup,
    refreshProfile,
    refreshTenant: refreshProfile,
    reloadAll: refreshProfile,
  };
}