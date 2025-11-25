// src/pages/setup/Setup.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

import { useUserTenant } from "../../context/UserTenantProvider";

export default function Setup() {
  const { loading, profile, tenant, reloadAll } = useUserTenant();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#ff1493");
  const [secondary, setSecondary] = useState("#ffffff");
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [saving, setSaving] = useState(false);

  /* ============================================================
     🔄 Preencher campos caso tenant já exista
  ============================================================ */
  useEffect(() => {
    if (!tenant) return;

    setName(tenant.name ?? "");
    setPrimary(tenant.primary_color ?? "#ff1493");
    setSecondary(tenant.secondary_color ?? "#ffffff");
    setVariant(tenant.theme_variant ?? "light");
  }, [tenant]);

  /* ============================================================
     ⏳ Loading
  ============================================================ */
  if (loading) return <div className="p-5 text-center">Carregando...</div>;

  /* ============================================================
     ❌ Sem profile (erro grave)
  ============================================================ */
  if (!profile)
    return <p className="text-center p-4 text-danger">Erro: perfil não encontrado.</p>;

  /* ============================================================
     🚫 Permissões (AJUSTADO AQUI)
  ============================================================ */
  // Permite owner e manager sempre.
  // Permite professional SOMENTE SE ele não tiver um tenant_id ainda (significa que está configurando seu primeiro salão).
  const canAccessSetup = profile.role === "owner" || profile.role === "manager" || (profile.role === "professional" && !profile.tenant_id);

  if (!canAccessSetup) {
    return (
      <p className="text-center p-4 text-danger">
        Você não tem permissão para configurar o salão.
      </p>
    );
  }

  /* ============================================================
     💾 Salvar configurações
  ============================================================ */
  const save = async () => {
    if (!profile) return;

    setSaving(true);

    try {
      let currentTenantId: string | null = tenant?.id ?? null; // Renomeado para evitar conflito e clareza
      const currentUserId = profile.user_id;
      const currentUserRole = profile.role;

      /* ============================================================
         1️⃣ Criar tenant caso ainda não exista
      ============================================================ */
      if (!currentTenantId) {
        const generatedId = crypto.randomUUID();

        const { data: newTenant, error: tenantErr } = await supabase
          .from("tenants")
          .insert({
            id: generatedId,
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: true,
            created_by: currentUserId,
          })
          .select("*")
          .single();

        if (tenantErr) throw tenantErr;

        currentTenantId = newTenant.id; // Agora currentTenantId é definitivamente uma string

        // Atualizar perfil: set tenant_id.
        // Apenas atualiza o papel para 'manager' se não for 'owner' ou 'manager'
        // (para não rebaixar um owner, por exemplo).
        const updateProfilePayload: { tenant_id: string; role?: 'manager' } = { tenant_id: currentTenantId! }; // <-- CORREÇÃO AQUI
        if (currentUserRole !== 'owner' && currentUserRole !== 'manager') {
          updateProfilePayload.role = 'manager';
        }
          const { error: profileErr } = await supabase
            .from("profiles")
            .update(updateProfilePayload)
            .eq("user_id", currentUserId);

          if (profileErr) throw profileErr;

          /* 🔥 FORÇA REVALIDAÇÃO DO JWT PARA CARREGAR tenant_id */
          await supabase.auth.refreshSession();

          /* 🔥 GARANTE QUE O HOOK USEUSERANDTENANT RECARREGOU O NOVO tenant_id */
          await reloadAll();


        // 🔥 NOVO: Criar entrada na tabela 'professionals' para o gerente
        // Primeiro, verificar se já existe um profissional vinculado a este user_id e tenant_id
        const { data: existingProfessional, error: checkProfError } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("tenant_id", currentTenantId)
          .maybeSingle();

        if (checkProfError) throw checkProfError;

        if (!existingProfessional) {
          // Se não existe, cria um novo
          const { error: createProfError } = await supabase
            .from("professionals")
            .insert({
              tenant_id: currentTenantId,
              name: profile.full_name,
              email: profile.email || null,
              user_id: currentUserId,
              is_active: true,
            });

          if (createProfError) throw createProfError;
        }
        // Se já existe, não faz nada.

      } else {
        /* ============================================================
           2️⃣ Atualizar tenant existente (apenas se o usuário atual for owner/manager)
        ============================================================ */
        if (currentUserRole === 'owner' || currentUserRole === 'manager') {
          const { error: updateErr } = await supabase
            .from("tenants")
            .update({
              name,
              primary_color: primary,
              secondary_color: secondary,
              theme_variant: variant,
              setup_complete: true,
            })
            .eq("id", currentTenantId);

          if (updateErr) throw updateErr;
        } else {
          // Se um usuário que não é owner/manager de alguma forma chegou aqui com um tenant existente,
          // ele não deve poder salvar os detalhes do tenant.
          toast.error("Você não tem permissão para atualizar as configurações do salão.");
          setSaving(false);
          return;
        }
      }

      /* ============================================================
         3️⃣ Recarregar tudo globalmente
      ============================================================ */
      await reloadAll();

      toast.success("Salão configurado com sucesso!");
      navigate("/dashboard", { replace: true });

    } catch (err: any) {
      console.error("Erro ao salvar setup:", err);
      toast.error(err?.message ?? "Erro ao configurar o salão.");
    }

    setSaving(false);
  };

  /* ============================================================
     JSX
  ============================================================ */
  return (
    <div className="container py-4">
      <h3>Configurar seu salão</h3>

      <div className="row g-3">

        {/* Nome */}
        <div className="col-12 col-md-6">
          <label className="form-label">Nome do salão</label>
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Cor primária */}
        <div className="col-6 col-md-3">
          <label className="form-label">Cor primária</label>
          <input
            type="color"
            className="form-control form-control-color"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          />
        </div>

        {/* Cor secundária */}
        <div className="col-6 col-md-3">
          <label className="form-label">Cor secundária</label>
          <input
            type="color"
            className="form-control form-control-color"
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
          />
        </div>

        {/* Tema */}
        <div className="col-12">
          <div className="btn-group" role="group">
            <button
              className={`btn ${variant === "light" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setVariant("light")}
            >
              🌞 Light
            </button>
            <button
              className={`btn ${variant === "dark" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setVariant("dark")}
            >
              🌙 Dark
            </button>
          </div>
        </div>

        {/* Botão salvar */}
        <div className="col-12">
          <button
            className="btn btn-success"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar e continuar"}
          </button>
        </div>

      </div>
    </div>
  );
}