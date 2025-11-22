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
    console.log("useUserAndTenant: clearAll called.");
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
    console.log("useUserAndTenant: refreshProfile called.");
    setLoading(true);
    setError(null);
    setProfessionalId(null); // Limpa antes de tentar carregar

    try {
      // Use authUser directly from AuthProvider
      const currentUser = authUser;

      if (!currentUser) {
        console.log("useUserAndTenant: No current user, clearing all.");
        clearAll();
        return;
      }

      // PROFILE
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!pData) {
        console.log("useUserAndTenant: Profile data not found for user, clearing all.");
        clearAll();
        return;
      }

      const finalProfile: Profile = {
        user_id: currentUser.id,
        email: currentUser.email, // Get email from currentUser
        role: pData.role,
        full_name: pData.full_name,
        avatar_url: pData.avatar_url,
        tenant_id: pData.tenant_id,
      };

      // Only update profile state if there's a change to avoid unnecessary re-renders
      setProfile(prevProfile => {
        if (JSON.stringify(prevProfile) === JSON.stringify(finalProfile)) {
          return prevProfile;
        }
        console.log("useUserAndTenant: Setting new profile:", finalProfile);
        return finalProfile;
      });

      // 🔥 NOVO: Se for um profissional, busca o professional_id correspondente e armazena em estado separado
      if (finalProfile.role === "professional" && finalProfile.tenant_id) {
        const { data: professionalEntry, error: profEntryError } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", currentUser.id) // Busca pelo user_id na tabela professionals
          .eq("tenant_id", finalProfile.tenant_id)
          .maybeSingle();

        if (profEntryError) {
          console.error("useUserAndTenant: Erro ao buscar entrada de profissional:", profEntryError);
        } else if (professionalEntry) {
          setProfessionalId(prevId => {
            if (prevId === professionalEntry.id) return prevId;
            console.log("useUserAndTenant: Setting new professionalId:", professionalEntry.id);
            return professionalEntry.id;
          });
        } else {
          setProfessionalId(null); // Ensure it's null if no entry found
        }
      } else {
        setProfessionalId(null); // Ensure it's null if not a professional or no tenant
      }

      // SEM TENANT_ID NO PERFIL → somente owners/managers podem ir para setup
      if (!finalProfile.tenant_id) {
        console.log("useUserAndTenant: Profile has no tenant_id, clearing tenant-related states.");
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        return;
      }

      // TENANT (se houver tenant_id no perfil)
      const { data: tData, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", finalProfile.tenant_id)
        .maybeSingle();

      if (tErr) throw tErr;

      if (!tData) {
        console.warn(`useUserAndTenant: Tenant with ID ${finalProfile.tenant_id} not found or inaccessible for user ${currentUser.id}. Clearing tenant data.`);
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        return; // Exit early as there's no valid tenant
      }

      setTenant(prevTenant => {
        if (JSON.stringify(prevTenant) === JSON.stringify(tData)) {
          return prevTenant;
        }
        console.log("useUserAndTenant: Setting new tenant:", tData);
        return tData;
      });

      // SUBSCRIPTION
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tData?.id)
        .maybeSingle();

      setSubscription(prevSub => {
        if (JSON.stringify(prevSub) === JSON.stringify(sub)) {
          return prevSub;
        }
        console.log("useUserAndTenant: Setting new subscription:", sub);
        return sub ?? null;
      });

      // PLAN + FEATURES
      if (tData?.plan_id) {
        const { data: planData } = await supabase
          .from("plans")
          .select("*")
          .eq("id", tData.plan_id)
          .maybeSingle();

        setPlan(prevPlan => {
          if (JSON.stringify(prevPlan) === JSON.stringify(planData)) {
            return prevPlan;
          }
          console.log("useUserAndTenant: Setting new plan:", planData);
          return planData ?? null;
        });

        const { data: feats } = await supabase
          .from("plan_features")
          .select("feature_key, enabled")
          .eq("plan_id", tData.plan_id);

        const newFeatures = (feats ?? []).filter((f) => f.enabled).map((f) => f.feature_key);
        setFeatures(prevFeatures => {
          if (JSON.stringify(prevFeatures) === JSON.stringify(newFeatures)) {
            return prevFeatures;
          }
          console.log("useUserAndTenant: Setting new features:", newFeatures);
          return newFeatures;
        });
      } else {
        setPlan(null);
        setFeatures([]);
      }

      // PERMISSIONS
      const { data: perms } = await supabase
        .from("permissions")
        .select("permission_key, allowed")
        .eq("tenant_id", finalProfile.tenant_id)
        .eq("user_id", currentUser.id);

      const newPermissions = (perms ?? []).filter((p) => p.allowed).map((p) => p.permission_key);
      setPermissions(prevPermissions => {
        if (JSON.stringify(prevPermissions) === JSON.stringify(newPermissions)) {
          return prevPermissions;
        }
        console.log("useUserAndTenant: Setting new permissions:", newPermissions);
        return newPermissions;
      });

    } catch (err: any) {
      console.error("useUserAndTenant: Erro ao carregar dados:", err);
      setError(err.message ?? "Erro ao carregar dados.");
      clearAll();
    } finally {
      console.log("useUserAndTenant: Setting loading to false.");
      setLoading(false);
    }
  }, [clearAll, authUser]); // Dependency on authUser

  // 🔹 Load inicial (now depends on authUser and authLoading)
  useEffect(() => {
    console.log("useUserAndTenant: useEffect triggered. authLoading:", authLoading, "authUser:", authUser);
    // Only trigger refreshProfile when authUser changes and AuthProvider is done loading
    if (!authLoading) {
      refreshProfile();
    }
  }, [authUser, authLoading, refreshProfile]); // Add authUser and authLoading to dependencies

  /* ============================================================
     🎯 needsSetup — owner/manager/professional sem tenant e sem force-reset
  ============================================================ */
  const needsSetup =
    !loading &&
    authUser && // Use authUser here
    profile &&
    !tenant && // Check if tenant is null
    (profile.role === "owner" || profile.role === "manager" || profile.role === "professional") && // <-- MODIFICADO AQUI
    window.location.pathname !== "/force-reset";

  return {
    loading,
    error,
    user: authUser, // Expose authUser from AuthProvider
    profile: profile ? { ...profile, professional_id: professionalId } : null, // Add professional_id to profile object when returning
    tenant,
    subscription,
    plan,
    features,
    permissions,
    needsSetup,
    refreshProfile,
    refreshTenant: refreshProfile, // refreshTenant can also call refreshProfile
    reloadAll: refreshProfile, // reloadAll can also call refreshProfile
  };
}