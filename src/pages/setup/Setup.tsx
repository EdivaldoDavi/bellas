// src/pages/setup/Setup.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

import { useUserTenant } from "../../context/UserTenantProvider";
import { useTheme } from "../../hooks/useTheme";

import styles from "./Setup.module.css";

export default function Setup() {
  const { loading, profile, tenant, reloadAll } = useUserTenant();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#ff1493");
  const [secondary, setSecondary] = useState("#ffffff");
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [saving, setSaving] = useState(false);

  /* ============================================================
     Preenche formulário quando o tenant existe
  ============================================================ */
  useEffect(() => {
    if (!tenant) return;

    setName(tenant.name ?? "");
    setPrimary(tenant.primary_color ?? "#ff1493");
    setSecondary(tenant.secondary_color ?? "#ffffff");
    setVariant(tenant.theme_variant ?? "light");
  }, [tenant]);

  /* ============================================================
     Loading e erros
  ============================================================ */
  if (loading) return <div className={styles.loading}>Carregando...</div>;

  if (!profile) {
    return <p className={styles.error}>Erro: perfil não encontrado.</p>;
  }

  /* ============================================================
     Controle de permissão
  ============================================================ */
  const canAccessSetup =
    profile.role === "owner" ||
    profile.role === "manager" ||
    (profile.role === "professional" && !profile.tenant_id);

  if (!canAccessSetup) {
    return <p className={styles.error}>Você não tem permissão para acessar esta página.</p>;
  }

  /* ============================================================
     SALVAR
  ============================================================ */
  const save = async () => {
    if (!profile) return;

    setSaving(true);

    try {
      let currentTenantId = tenant?.id ?? null;
      const currentUserId = profile.user_id;
      const currentRole = profile.role;

      // 1️⃣ Criar tenant
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
        currentTenantId = newTenant.id;

        // Atualiza o perfil
        const updatePayload: any = { tenant_id: currentTenantId };
        if (currentRole !== "owner" && currentRole !== "manager") {
          updatePayload.role = "manager";
        }

        const { error: profileErr } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", currentUserId);

        if (profileErr) throw profileErr;

        await supabase.auth.refreshSession();
        await reloadAll();

        // cria o professional se ainda não existir
        const { data: existingProfessional } = await supabase
          .from("professionals")
          .select("id")
          .eq("tenant_id", currentTenantId)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (!existingProfessional) {
          await supabase.from("professionals").insert({
            tenant_id: currentTenantId,
            name: profile.full_name,
            email: profile.email || null,
            user_id: currentUserId,
            is_active: true,
          });
        }
      }

      // 2️⃣ Atualiza tenant existente
      else if (currentRole === "owner" || currentRole === "manager") {
        const { error: updErr } = await supabase
          .from("tenants")
          .update({
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: true,
          })
          .eq("id", currentTenantId);

        if (updErr) throw updErr;
      } else {
        toast.error("Você não pode alterar estes dados.");
        setSaving(false);
        return;
      }

      await reloadAll();
      toast.success("Configuração salva com sucesso! 🎉");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao configurar o salão.");
    }

    setSaving(false);
  };

  /* ============================================================
     THEME HANDLERS
  ============================================================ */
  const handleSelectLight = () => {
    setVariant("light");
    if (theme !== "light") toggleTheme();
  };

  const handleSelectDark = () => {
    setVariant("dark");
    if (theme !== "dark") toggleTheme();
  };

  /* ============================================================
     JSX
  ============================================================ */
  return (
    <div className={styles.setupContainer}>
      <div className={styles.setupCard}>
        <h2 className={styles.title}>Vamos começar criando sua empresa ✨</h2>

        <p className={styles.subtitle}>
          Antes de usar o sistema, vamos configurar seu espaço de trabalho.
          Pode ser um salão, estúdio, clínica, MEI ou até mesmo você como profissional autônomo.
        </p>

        {/* Nome */}
        <label className={styles.colorLabel}>Nome da sua marca ou salão</label>

        <input
          className={styles.input}
          value={name}
          placeholder="Ex.: Studio da Ana / Carla MEI"
          onChange={(e) => setName(e.target.value)}
        />

        {/* 🎨 CORES */}
        <div className={styles.colorsSection}>
          <h4 className={styles.sectionTitle}>
            Personalize o visual da sua marca 🎨
          </h4>

          <p className={styles.sectionDescription}>
            Essas cores serão usadas no tema, botões, menus e destaques do sistema.
          </p>

          <div className={styles.colorsRow}>
            {/* Cor Primária */}
            <div className={styles.colorItem}>
              <label className={styles.colorLabel}>
                Cor primária
                <span className={styles.colorHint}>
                  Usada em botões e destaques principais.
                </span>
              </label>

              <input
                type="color"
                className={styles.colorInput}
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
              />

              <p className={styles.colorExample}>
                Ex.: rosa, azul, roxo…
              </p>
            </div>

            {/* Cor Secundária */}
            <div className={styles.colorItem}>
              <label className={styles.colorLabel}>
                Cor secundária
                <span className={styles.colorHint}>
                  Usada em fundos e detalhes.
                </span>
              </label>

              <input
                type="color"
                className={styles.colorInput}
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
              />

              <p className={styles.colorExample}>
                Geralmente uma cor mais clara.
              </p>
            </div>
          </div>
        </div>

        {/* 🌞 / 🌙 Tema */}
        <div className={styles.themeRow}>
          <button
            className={`${styles.themeBtn} ${
              variant === "light" ? styles.themeSelected : ""
            }`}
            onClick={handleSelectLight}
          >
            🌞 Claro
          </button>

          <button
            className={`${styles.themeBtn} ${
              variant === "dark" ? styles.themeSelected : ""
            }`}
            onClick={handleSelectDark}
          >
            🌙 Escuro
          </button>
        </div>

        {/* Salvar */}
        <button
          className={styles.saveButton}
          disabled={saving}
          onClick={save}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </div>
    </div>
  );
}
