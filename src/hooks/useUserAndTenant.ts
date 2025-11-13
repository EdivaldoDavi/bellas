import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseCleint";

export function useUserAndTenant() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  const reloadProfile = useCallback(async () => {
    setLoading(true);

    // ======================================================
    // 1️⃣ Carregar usuário autenticado
    // ======================================================
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);

    if (!user) {
      setProfile(null);
      setTenant(null);
      setSubscription(null);
      setPlan(null);
      setFeatures([]);
      setPermissions([]);
      setLoading(false);
      return;
    }

    // ======================================================
    // 2️⃣ Carregar profile do usuário
    // ======================================================
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, tenant_id, role, full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    const combinedProfile = {
      user_id: user.id,
      email: user.email,
      role: profileData?.role || "user",
      full_name: profileData?.full_name || user.user_metadata?.full_name || "",
      avatar_url:
        profileData?.avatar_url || user.user_metadata?.avatar_url || "",
      tenant_id: profileData?.tenant_id || null,
    };

    setProfile(combinedProfile);

    // 🔒 Se o usuário não tiver tenant, encerra
    if (!combinedProfile.tenant_id) {
      setTenant(null);
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    // ======================================================
    // 3️⃣ Carregar tenant
    // ======================================================
    const { data: tenantData } = await supabase
      .from("tenants")
      .select(
        "id, name, theme_variant, primary_color, secondary_color, plan_id, setup_complete, whatsapp_number"
      )
      .eq("id", combinedProfile.tenant_id)
      .single();

    setTenant(tenantData);

    // Aplicar cores do tenant no Theme
    if (tenantData?.primary_color)
      document.documentElement.style.setProperty(
        "--color-primary",
        tenantData.primary_color
      );

    if (tenantData?.secondary_color)
      document.documentElement.style.setProperty(
        "--color-secondary",
        tenantData.secondary_color
      );

    // ======================================================
    // 4️⃣ Carregar assinatura (subscription) ⚠️ NOVO
    // ======================================================
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenantData?.id)
      .single();

    setSubscription(subData || null);

    // ======================================================
    // 5️⃣ Carregar plano
    // ======================================================
    if (tenantData?.plan_id) {
      const { data: planData } = await supabase
        .from("plans")
        .select("*")
        .eq("id", tenantData.plan_id)
        .single();

      setPlan(planData);

      // ====================================================
      // 6️⃣ Carregar features do plano
      // ====================================================
      const { data: feats } = await supabase
        .from("plan_features")
        .select("feature_key, enabled")
        .eq("plan_id", tenantData.plan_id);

      setFeatures((feats || []).filter((f) => f.enabled).map((f) => f.feature_key));
    }

    // ======================================================
    // 7️⃣ Carregar permissões do usuário
    // ======================================================
    const { data: perms } = await supabase
      .from("permissions")
      .select("permission_key, allowed")
      .eq("tenant_id", combinedProfile.tenant_id)
      .eq("user_id", user.id);

    setPermissions(
      (perms || []).filter((p) => p.allowed).map((p) => p.permission_key)
    );

    setLoading(false);
  }, []);

  // Atualiza ao iniciar
  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  return {
    loading,
    user,
    profile,
    tenant,
    subscription,   // 🔥 agora existe!
    plan,
    features,
    permissions,
    reloadProfile,
  };
}
