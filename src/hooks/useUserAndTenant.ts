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
     🔄 Limpar tudo com segurança
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
     🔥 Carregamento principal
  ============================================================ */
const reloadProfile = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user ?? null;

    if (!currentUser) {
      clearAll();
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const { data: pData } = await supabase
      .from("profiles")
      .select("user_id, tenant_id, role, full_name, avatar_url")
      .eq("user_id", currentUser.id)
      .single();

    const profile: Profile = {
      user_id: currentUser.id,
      email: currentUser.email,
      role: pData?.role ?? null,
      full_name: pData?.full_name ?? currentUser.user_metadata?.full_name ?? "",
      avatar_url: pData?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null,
      tenant_id: pData?.tenant_id ?? null,
    };

    setProfile(profile);

    if (!profile.tenant_id) {
      setTenant(null);
      setLoading(false);
      return;
    }

    const { data: tData } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .single();

    setTenant(tData);
    
  } catch (err: any) {
    console.error(err);
    clearAll();
  } finally {
    setLoading(false);
  }
}, []); // ← SEM DEPENDÊNCIAS

  /* ============================================================
     ⏳ Executar ao montar
  ============================================================ */
  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  /* ============================================================
     🎯 Detectar se precisa fazer o setup
  ============================================================ */
 
const needsSetup = Boolean(!loading && user && profile && !tenant);

  /* ============================================================
     📤 Retorno do hook
  ============================================================ */
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
