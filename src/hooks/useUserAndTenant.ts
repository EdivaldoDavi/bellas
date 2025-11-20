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
   📌 Hook
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
     🧹 Limpar tudo
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
     🔥 RELOAD PROFILE + TENANT
     (Com a grande correção)
  ============================================================ */
  const reloadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /* 1️⃣ Sessão */
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;

      const currentUser = sess.session?.user ?? null;
      setUser(currentUser);

      /* ⛔️ SEM USUÁRIO? LIMPA TUDO E PARA! */
      if (!currentUser) {
        clearAll();
        return;
      }

      /* 2️⃣ Profile */
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (pErr) throw pErr;

      const finalProfile: Profile = {
        user_id: currentUser.id,
        email: currentUser.email,
        role: pData?.role ?? null,
        full_name:
          pData?.full_name ?? currentUser.user_metadata?.full_name ?? "",
        avatar_url:
          pData?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null,
        tenant_id: pData?.tenant_id ?? null,
      };

      setProfile(finalProfile);

      /* 3️⃣ SEM TENANT → STOP */
      if (!finalProfile.tenant_id) {
        setTenant(null);
        return;
      }

      /* 4️⃣ Tenant */
      const { data: tData, error: tErr } = await supabase
        .from("tenants")
        .select(
          "id, name, theme_variant, primary_color, secondary_color, setup_complete, plan_id, whatsapp_number"
        )
        .eq("id", finalProfile.tenant_id)
        .maybeSingle();

      if (tErr) throw tErr;

      setTenant(tData);

      /* 5️⃣ Subscription */
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tData?.id)
        .maybeSingle();

      setSubscription(sub ?? null);

      /* 6️⃣ Plano */
      if (tData?.plan_id) {
        const { data: planData } = await supabase
          .from("plans")
          .select("*")
          .eq("id", tData.plan_id)
          .maybeSingle();

        setPlan(planData ?? null);

        /* 7️⃣ Features */
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

      /* 8️⃣ Permissões */
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
      clearAll();
      setError(err.message ?? "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [clearAll]);

  /* ============================================================
     ⏳ Carregar ao montar
  ============================================================ */
  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  /* ============================================================
     🎯 needsSetup
  ============================================================ */
  const needsSetup = Boolean(user && profile && !tenant);

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
