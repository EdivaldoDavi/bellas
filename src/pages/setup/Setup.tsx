import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

export default function Setup() {
  const { loading, profile, tenant, reloadProfile } = useUserAndTenant();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#ff1493");
  const [secondary, setSecondary] = useState("#ffffff");
  const [variant, setVariant] = useState<"light" | "dark">("light");

  const [saving, setSaving] = useState(false);

  /* ============================================================================
     1️⃣ REDIRECIONAMENTO SE O USUÁRIO JÁ TEM TENANT
     - NUNCA mostrar a tela de setup para usuários que já configuraram o salão
  ============================================================================ */
  useEffect(() => {
    if (loading) return;
    if (saving) return;

    if (tenant?.id) {
      navigate("/dashboard", { replace: true });
    }
  }, [tenant?.id, loading, saving]);

  /* ============================================================================
     2️⃣ CARREGAR DADOS EXISTENTES
  ============================================================================ */
  useEffect(() => {
    if (!tenant) return;

    setName(tenant.name ?? "");
    setPrimary(tenant.primary_color ?? "#ff1493");
    setSecondary(tenant.secondary_color ?? "#ffffff");
    setVariant(tenant.theme_variant ?? "light");
  }, [tenant]);

  /* ============================================================================
     3️⃣ PROTEÇÕES
  ============================================================================ */

  if (loading) {
    return <div className="p-5 text-center">Carregando...</div>;
  }

  if (!profile) {
    return (
      <p className="text-center p-4 text-danger">
        Erro: perfil não encontrado.
      </p>
    );
  }

  if (
    profile.role === "client" ||
    profile.role === "staff" ||
    profile.role === "professional"
  ) {
    return (
      <p className="text-center p-4 text-danger">
        Você não tem permissão para configurar o salão.
      </p>
    );
  }

  /* ============================================================================
     4️⃣ SALVAR CONFIGURAÇÕES
  ============================================================================ */
  const save = async () => {
    setSaving(true);

    try {
      let tenantId = tenant?.id ?? null;

      // Criar tenant se não existir
      if (!tenantId) {
        const { data: newTenant, error: tenantErr } = await supabase
          .from("tenants")
          .insert({
            id: crypto.randomUUID(),
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

        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ tenant_id: tenantId })
          .eq("user_id", profile.user_id);

        if (profileErr) throw profileErr;
      }

      // Atualizar tenant existente
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

      // Reload e redireciona
      await reloadProfile();

      toast.success("Salão configurado com sucesso!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Erro ao salvar setup:", err);
      toast.error(err?.message ?? "Erro ao configurar o salão.");
    }

    setSaving(false);
  };

  /* ============================================================================
     5️⃣ UI
  ============================================================================ */
  return (
    <div className="container py-4">
      <h3>Configurar seu salão</h3>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Nome do salão</label>
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label">Cor primária</label>
          <input
            type="color"
            className="form-control form-control-color"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          />
        </div>

        <div className="col-6 col-md-3">
          <label className="form-label">Cor secundária</label>
          <input
            type="color"
            className="form-control form-control-color"
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
          />
        </div>

        <div className="col-12">
          <div className="btn-group" role="group">
            <button
              className={`btn ${
                variant === "light" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setVariant("light")}
            >
              🌞 Light
            </button>
            <button
              className={`btn ${
                variant === "dark" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setVariant("dark")}
            >
              🌙 Dark
            </button>
          </div>
        </div>

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
