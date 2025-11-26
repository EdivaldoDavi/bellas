// src/pages/setup/Setup.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

import { useUserTenant } from "../../context/UserTenantProvider";
import { useTheme } from "../../hooks/useTheme"; // 👈 IMPORTANTE

import styles from "./Setup.module.css";

export default function Setup() {
  const { loading, profile, tenant, reloadAll } = useUserTenant();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme(); // 👈 THEME GLOBAL

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#ff1493");
  const [secondary, setSecondary] = useState("#ffffff");
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [saving, setSaving] = useState(false);

  /* ============================================================
     Preenche o formulário se já existir tenant
  ============================================================ */
  useEffect(() => {
    if (!tenant) return;

    setName(tenant.name ?? "");
    setPrimary(tenant.primary_color ?? "#ff1493");
    setSecondary(tenant.secondary_color ?? "#ffffff");
    setVariant(tenant.theme_variant ?? "light");
  }, [tenant]);

  /* ============================================================
     Loading / erros
  ============================================================ */
  if (loading) return <div className={styles.loading}>Carregando...</div>;

  if (!profile) {
    return <p className={styles.error}>Erro: perfil não encontrado.</p>;
  }

  /* ============================================================
     Permissões
  ============================================================ */
  const canAccessSetup =
    profile.role === "owner" ||
    profile.role === "manager" ||
    (profile.role === "professional" && !profile.tenant_id);

  if (!canAccessSetup) {
    return (
      <p className={styles.error}>
        Você não tem permissão para configurar este salão.
      </p>
    );
  }

  /* ============================================================
     Salvar
  ============================================================ */
  const save = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      let currentTenantId: string | null = tenant?.id ?? null;
      const currentUserId = profile.user_id;
      const currentUserRole = profile.role;

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

        const updatePayload: any = { tenant_id: currentTenantId };
        if (currentUserRole !== "owner" && currentUserRole !== "manager") {
          updatePayload.role = "manager";
        }

        const { error: profileErr } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", currentUserId);

        if (profileErr) throw profileErr;

        await supabase.auth.refreshSession();
        await reloadAll();

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

      // 2️⃣ Atualizar tenant existente
      else if (currentUserRole === "owner" || currentUserRole === "manager") {
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
        toast.error("Você não pode atualizar este salão.");
        setSaving(false);
        return;
      }

      // 3️⃣ Reload
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
     Handlers de tema (claro/escuro)
  ============================================================ */
  function handleSelectLight() {
    setVariant("light");

    // Se o tema global não for light, alterna
    if (theme !== "light") {
      toggleTheme();
    }
  }

  function handleSelectDark() {
    setVariant("dark");

    // Se o tema global não for dark, alterna
    if (theme !== "dark") {
      toggleTheme();
    }
  }

  /* ============================================================
     JSX
  ============================================================ */
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Vamos começar criando sua empresa ✨</h2>
        <p className={styles.subtitle}>
          Antes de usar o sistema, precisamos configurar seu espaço de trabalho.
          Pode ser um salão, estúdio, clínica, MEI ou até mesmo você
          como profissional autônomo.
        </p>

        <div className={styles.form}>
          {/* Nome */}
          <label className={styles.label}>
            Nome da sua marca ou do seu salão
          </label>
          <input
            className={styles.input}
            value={name}
            placeholder="Ex.: Studio da Ana /  Carla MEI"
            onChange={(e) => setName(e.target.value)}
          />

          {/* Cores */}
{/* 🎨 Seção de Cores */}
<div className={styles.colorsSection}>

  <h4 className={styles.sectionTitle}>Personalize o visual da sua marca 🎨</h4>

  <p className={styles.sectionDescription}>
    Escolha as cores que serão usadas nos botões, menus, destaques e no tema geral da sua aplicação.
    É como escolher as cores da sua identidade visual — e você poderá mudar isso quando quiser.
  </p>

  <div className={styles.colorsRow}>

    {/* Cor primária */}
    <div className={styles.colorItem}>
      <label className={styles.colorLabel}>
        Cor primária
        <span className={styles.colorHint}>
          Usada em botões, destaques e elementos principais.
        </span>
      </label>

      <input
        type="color"
        className={styles.colorInput}
        value={primary}
        onChange={(e) => setPrimary(e.target.value)}
      />

      <p className={styles.colorExample}>
        Ex.: rosa, azul, roxo… escolha a cor principal da sua marca.
      </p>
    </div>

    {/* Cor secundária */}
    <div className={styles.colorItem}>
      <label className={styles.colorLabel}>
        Cor secundária
        <span className={styles.colorHint}>
          Usada como contraste, fundo ou detalhes adicionais.
        </span>
      </label>

      <input
        type="color"
        className={styles.colorInput}
        value={secondary}
        onChange={(e) => setSecondary(e.target.value)}
      />

      <p className={styles.colorExample}>
        Normalmente uma cor mais clara para combinar com a primária.
      </p>
    </div>

  </div>
</div>

          {/* Tema */}
          <div className={styles.theme}>
            <button
              type="button"
              className={`${styles.themeBtn} ${
                variant === "light" ? styles.selected : ""
              }`}
              onClick={handleSelectLight}
            >
              🌞 Claro
            </button>

            <button
              type="button"
              className={`${styles.themeBtn} ${
                variant === "dark" ? styles.selected : ""
              }`}
              onClick={handleSelectDark}
            >
              🌙 Escuro
            </button>
          </div>

          {/* Botão salvar */}
          <button
            className={styles.saveBtn}
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
