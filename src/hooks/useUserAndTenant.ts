// src/hooks/useUserAndTenant.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseCleint";

type Profile = {
  user_id: string;
  email: string | undefined;
  role: string;
  full_name: string;
  avatar_url: string | null;
  tenant_id: string | null;
};

export function useUserAndTenant() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clearAll = () => {
    setProfile(null);
    setTenant(null);
    setSubscription(null);
    setPlan(null);
    setFeatures([]);
    setPermissions([]);
  };

  const reloadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Usuário autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      setUser(user);

      if (!user) {
        clearAll();
        setLoading(false);
        return;
      }

      // 2️⃣ Profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, tenant_id, role, full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const combinedProfile: Profile = {
        user_id: user.id,
        email: user.email,
        role: profileData?.role || "client", // fallback coerente com a constraint
        full_name:
          profileData?.full_name || (user.user_metadata as any)?.full_name || "",
        avatar_url:
          profileData?.avatar_url ||
          (user.user_metadata as any)?.avatar_url ||
          null,
        tenant_id: profileData?.tenant_id ?? null,
      };

      setProfile(combinedProfile);

      // Se ainda não tem tenant, para por aqui (caso novo usuário indo para /setup)
      if (!combinedProfile.tenant_id) {
        setTenant(null);
        setSubscription(null);
        setPlan(null);
        setFeatures([]);
        setPermissions([]);
        setLoading(false);
        return;
      }

      // 3️⃣ Tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select(
          "id, name, theme_variant, primary_color, secondary_color, plan_id, setup_complete, whatsapp_number"
        )
        .eq("id", combinedProfile.tenant_id)
        .maybeSingle();

      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // Aplicar tema do tenant
      if (tenantData?.primary_color) {
        document.documentElement.style.setProperty(
          "--color-primary",
          tenantData.primary_color
        );
      }
      if (tenantData?.secondary_color) {
        document.documentElement.style.setProperty(
          "--color-secondary",
          tenantData.secondary_color
        );
      }

      // 4️⃣ Subscription
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", tenantData?.id)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData || null);

      // 5️⃣ Plano
      if (tenantData?.plan_id) {
        const { data: planData, error: planError } = await supabase
          .from("plans")
          .select("*")
          .eq("id", tenantData.plan_id)
          .maybeSingle();

        if (planError) throw planError;
        setPlan(planData);

        // 6️⃣ Plan features
        const { data: feats, error: featsError } = await supabase
          .from("plan_features")
          .select("feature_key, enabled")
          .eq("plan_id", tenantData.plan_id);

        if (featsError) throw featsError;

        setFeatures(
          (feats || []).filter((f) => f.enabled).map((f) => f.feature_key)
        );
      } else {
        setPlan(null);
        setFeatures([]);
      }

      // 7️⃣ Permissions
      const { data: perms, error: permsError } = await supabase
        .from("permissions")
        .select("permission_key, allowed")
        .eq("tenant_id", combinedProfile.tenant_id)
        .eq("user_id", user.id);

      if (permsError) throw permsError;

      setPermissions(
        (perms || []).filter((p) => p.allowed).map((p) => p.permission_key)
      );
    } catch (err: any) {
      console.error("Erro em useUserAndTenant:", err);
      setError(err?.message ?? "Erro ao carregar dados do usuário/tenant.");
      clearAll();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

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
    reloadProfile,
  };
}
