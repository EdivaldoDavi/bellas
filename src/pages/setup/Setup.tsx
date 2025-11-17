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
     🚫 Permissões
  ============================================================ */
  if (["client", "staff", "professional"].includes(profile.role ?? "")) {
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
      let tenantId = tenant?.id ?? null;

      /* ============================================================
         1️⃣ Criar tenant caso ainda não exista
      ============================================================ */
      if (!tenantId) {
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
            created_by: profile.user_id,
          })
          .select("*")
          .single();

        if (tenantErr) throw tenantErr;

        tenantId = newTenant.id;

        /* Atualizar perfil */
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ tenant_id: tenantId })
          .eq("user_id", profile.user_id);

        if (profileErr) throw profileErr;
      }

      /* ============================================================
         2️⃣ Atualizar tenant existente
      ============================================================ */
      const { error: updateErr } = await supabase
        .from("tenants")
        .update({
          name,
          primary_color: primary,
          secondary_color: secondary,
          theme_variant: variant,
          setup_complete: true,
        })
        .eq("id", tenantId);

      if (updateErr) throw updateErr;

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
