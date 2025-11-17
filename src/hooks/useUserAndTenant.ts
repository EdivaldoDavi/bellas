import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseCleint";

export type Profile = {
  user_id: string;
  email: string | undefined;
  // <-- MUDANÇA 1: Removido 'role' do Type
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
    🔄 Função utilitária para limpar tudo com segurança
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
    🔥 Função principal – Carrega todo o contexto
  ============================================================ */
  const reloadProfile = useCallback(async () => {
   setLoading(true);
   setError(null);

   try {
     /* 1️⃣ Buscar sessão */
     const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
     if (sessErr) throw sessErr;

     const currentUser = sessionData.session?.user ?? null;
     setUser(currentUser);

     if (!currentUser) {
      clearAll();
      return;
     }

     /* 2️⃣ Buscar perfil (AGORA CORRETO) */
     const { data: pData, error: pErr } = await supabase
      .from("profiles")
      // <-- MUDANÇA 2: Removido 'role' da consulta
      .select("id, tenant_id, full_name, avatar_url")
      .eq("id", currentUser.id)
      .maybeSingle();

     if (pErr) throw pErr;

     const finalProfile: Profile = {
      user_id: currentUser.id,
      email: currentUser.email,
      // <-- MUDANÇA 3: Removida a atribuição 'role' do objeto
      full_name:
        pData?.full_name ??
        (currentUser.user_metadata as any)?.full_name ??
        "",
      avatar_url:
        pData?.avatar_url ??
        (currentUser.user_metadata as any)?.avatar_url ??
        null,
      tenant_id: pData?.tenant_id ?? null,
     };

     setProfile(finalProfile);

     /* 3️⃣ Usuário ainda sem tenant → parar aqui */
     if (!finalProfile.tenant_id) {
      setTenant(null);
      return;
     }

     /* 4️⃣ Buscar tenant */
     const { data: tData, error: tErr } = await supabase
      .from("tenants")
      .select(
        "id, name, theme_variant, primary_color, secondary_color, setup_complete, plan_id, whatsapp_number"
      )
      .eq("id", finalProfile.tenant_id)
      .maybeSingle();

     if (tErr) throw tErr;

     setTenant(tData);

     /* 🎨 Aplicar tema do tenant */
     if (tData?.theme_variant)
      document.documentElement.setAttribute("data-theme-variant", tData.theme_variant);

     if (tData?.primary_color)
      document.documentElement.style.setProperty("--color-primary", tData.primary_color);

      if (tData?.secondary_color)
      document.documentElement.style.setProperty("--color-secondary", tData.secondary_color);

     /* 5️⃣ Assinatura do tenant */
     const { data: subData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tData?.id)
      .maybeSingle();

     setSubscription(subData ?? null);

     /* 6️⃣ Buscar plano */
     if (tData?.plan_id) {
      const { data: planData } = await supabase
        .from("plans")
        .select("*")
        .eq("id", tData?.plan_id)
        .maybeSingle();

      setPlan(planData ?? null);

      /* 7️⃣ Features */
       const { data: feats } = await supabase
        .from("plan_features")
        .select("feature_key, enabled")
        .eq("plan_id", tData?.plan_id);

      setFeatures((feats ?? []).filter(f => f.enabled).map(f => f.feature_key));
     } else {
      setPlan(null);
      setFeatures([]);
     }

     /* 8️⃣ Permissões (Agora é a fonte da verdade) */
     const { data: perms } = await supabase
      .from("permissions")
      .select("permission_key, allowed")
      .eq("tenant_id", finalProfile.tenant_id)
      .eq("user_id", currentUser.id);

     setPermissions((perms ?? []).filter(p => p.allowed).map(p => p.permission_key));

   } catch (err: any) {
     console.error("Erro em useUserAndTenant:", err);
     setError(err.message ?? "Erro ao carregar dados do usuário.");
     clearAll();
   } finally {
     setLoading(false);
   }
  }, [clearAll]);

  useEffect(() => {
   reloadProfile();
  }, [reloadProfile]);

  /* ============================================================
    🚨 DETECÇÃO AUTOMÁTICA DE ONBOARDING
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
   permissions, // <-- É ISTO QUE VOCÊ VAI USAR
   needsSetup,
   reloadProfile,
  };
}