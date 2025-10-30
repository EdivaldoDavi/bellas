import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseCleint";

export function useUserAndTenant() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const reloadProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (!user) {
      setProfile(null);
      setTenant(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    // 🔹 Busca dados do perfil na tabela `profiles`
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, tenant_id, role, full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    // 🔹 Combina dados do Supabase Auth + tabela profiles
    const combinedProfile = {
      user_id: user.id,
      email: user.email, // vem do auth.users
      role: profileData?.role || "user",
      full_name: profileData?.full_name || user.user_metadata?.full_name || "",
      avatar_url:
        profileData?.avatar_url || user.user_metadata?.avatar_url || "",
      tenant_id: profileData?.tenant_id || null,
    };

    setProfile(combinedProfile);

    // 🔹 Carrega tenant, plano, permissões
    if (combinedProfile.tenant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select(
          "id, name, theme_variant, primary_color, secondary_color, plan_id, setup_complete"
        )
        .eq("id", combinedProfile.tenant_id)
        .single();
      setTenant(tenant);

      if (tenant?.primary_color)
        document.documentElement.style.setProperty(
          "--color-primary",
          tenant.primary_color
        );
      if (tenant?.secondary_color)
        document.documentElement.style.setProperty(
          "--color-secondary",
          tenant.secondary_color
        );

      if (tenant?.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("*")
          .eq("id", tenant.plan_id)
          .single();
        setPlan(plan);

        const { data: feats } = await supabase
          .from("plan_features")
          .select("feature_key, enabled")
          .eq("plan_id", tenant.plan_id);
        setFeatures(
          (feats || []).filter((f) => f.enabled).map((f) => f.feature_key)
        );
      }

      const { data: perms } = await supabase
        .from("permissions")
        .select("permission_key, allowed")
        .eq("tenant_id", combinedProfile.tenant_id)
        .eq("user_id", user.id);

      setPermissions(
        (perms || []).filter((p) => p.allowed).map((p) => p.permission_key)
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  return {
    loading,
    user,
    profile,
    tenant,
    plan,
    features,
    permissions,
    reloadProfile,
  };
}
