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

  // Remove local user state, it will come from useAuth
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  /* ============================================================
     🧹 Limpa tudo
  ============================================================ */
  const clearAll = useCallback(() => {
    setProfile(null);
    setTenant(null);
    setSubscription(null);
    setPlan(null);
    setFeatures([]);
    setPermissions([]);
  }, []);

  /* ============================================================
     🔥 Recarregar Profile + Tenant
  ============================================================ */
  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use authUser directly from AuthProvider
      const currentUser = authUser;

      if (!currentUser) {
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

      setProfile(finalProfile);

      // SEM TENANT → somente owners/managers podem ir para setup
      if (!finalProfile.tenant_id) {
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

      setTenant(tData);

      // SUBSCRIPTION
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tData?.id)
        .maybeSingle();

      setSubscription(sub ?? null);

      // PLAN + FEATURES
      if (tData?.plan_id) {
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
          (feats ?? []).filter((f) => f.enabled).map((f) => f.feature_key)
        );
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

      setPermissions(
        (perms ?? []).filter((p) => p.allowed).map((p) => p.permission_key)
      );
    } catch (err: any) {
      console.error("Erro useUserAndTenant:", err);
      setError(err.message ?? "Erro ao carregar dados.");
      clearAll();
    } finally {
      setLoading(false);
    }
  }, [clearAll, authUser]); // Dependency on authUser

  // 🔹 Load inicial (now depends on authUser and authLoading)
  useEffect(() => {
    // Only trigger refreshProfile when authUser changes and AuthProvider is done loading
    if (!authLoading) {
      refreshProfile();
    }
  }, [authUser, authLoading, refreshProfile]); // Add authUser and authLoading to dependencies

  // Remove the onAuthStateChange listener from here, as it's now handled by AuthProvider

  /* ============================================================
     🎯 needsSetup — owner/manager sem tenant e sem force-reset
  ============================================================ */
  const needsSetup =
    !loading &&
    authUser && // Use authUser here
    profile &&
    !tenant &&
    (profile.role === "owner" || profile.role === "manager") &&
    window.location.pathname !== "/force-reset";

  return {
    loading,
    error,
    user: authUser, // Expose authUser from AuthProvider
    profile,
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