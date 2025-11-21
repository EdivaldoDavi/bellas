// src/hooks/useUserAndTenant.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseCleint";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
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
    setUser(null);
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
  const reloadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Recupera sessão
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;

      const currentUser = sess.session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        clearAll();
        return;
      }

      // 2️⃣ Busca profile
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;

      if (!pData) {
        // Usuário sem profile = algo errado
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

      setProfile(finalProfile);

      // 3️⃣ Sem tenant → owners/managers caem no setup, outros seguem sem tenant
      if (!finalProfile.tenant_id) {
        setTenant(null);
        return;
      }

      // 4️⃣ Carrega tenant
      const { data: tData, error: tErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", finalProfile.tenant_id)
        .maybeSingle();

      if (tErr) throw tErr;

      setTenant(tData);

      // 5️⃣ Subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tData?.id)
        .maybeSingle();

      setSubscription(sub ?? null);

      // 6️⃣ Plano + Features
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

      // 7️⃣ Permissions
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
  }, [clearAll]);

  /* 🔹 Load inicial */
  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  /* 🔹 Recarregar sempre que a auth mudar (login, logout, reset, etc.) */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      // console.log("Auth change (useUserAndTenant):", _event);
      reloadProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [reloadProfile]);

  /* ============================================================
     🎯 needsSetup — apenas owner/manager sem tenant (fora do force-reset)
  ============================================================ */
  const needsSetup =
    !loading &&
    user &&
    profile &&
    !tenant &&
    (profile.role === "owner" || profile.role === "manager") &&
    window.location.pathname !== "/force-reset";

  return {
    loading,
    error,
    user,
    profile,
    tenant,
    subscription,
    plan,
    features,
    permissions,
    needsSetup,
    reloadProfile,
  };
}
