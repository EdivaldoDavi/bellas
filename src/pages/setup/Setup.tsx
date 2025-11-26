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

  /* ============================================================
     STEPS INTERNOS DO SETUP
  ============================================================ */
  const [step, setStep] = useState<1 | 2>(1);

  /* ============================================================
     FORM STATE - Initialize directly from tenant if available
  ============================================================ */
  // Use functional updates for useState to ensure initial values are computed
  // only once and correctly reflect the initial `tenant` value.
  const [name, setName] = useState(() => tenant?.name || "");
  const [primary, setPrimary] = useState(() => tenant?.primary_color || "#ff1493");
  const [secondary, setSecondary] = useState(() => tenant?.secondary_color || "#ffffff");
  const [variant, setVariant] = useState<"light" | "dark">(() => tenant?.theme_variant || "light");

  const [saving, setSaving] = useState(false);

  /* ============================================================
     CARREGAR TENANT (SE EXISTIR) - Atualiza campos se o tenant mudar após a montagem inicial
  ============================================================ */
  useEffect(() => {
    // Este efeito garante que, se o objeto `tenant` no contexto mudar (por exemplo,
    // após a criação de um novo tenant via `saveStep1` e `reloadAll`),
    // os campos do formulário sejam atualizados para refletir os novos dados.
    // A condição `!saving` evita que o formulário seja resetado enquanto o salvamento está em andamento.
    if (tenant && !saving) {
      setName(tenant.name || "");
      setPrimary(tenant.primary_color || "#ff1493");
      setSecondary(tenant.secondary_color || "#ffffff");
      setVariant(tenant.theme_variant || "light");
    }
  }, [tenant, saving]); // Depende de `tenant` e `saving`

  /* ============================================================
     PERMISSÕES
  ============================================================ */
  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (!profile) return <p className={styles.error}>Erro: perfil não encontrado.</p>;

  const canAccessSetup =
    profile.role === "owner" ||
    profile.role === "manager" ||
    (!profile.tenant_id && profile.role === "professional");

  if (!canAccessSetup) {
    return <p className={styles.error}>Você não tem permissão para acessar o setup.</p>;
  }

  /* ============================================================
     HANDLERS DE TEMA
  ============================================================ */
  function selectLight() {
    setVariant("light");
    if (theme !== "light") toggleTheme();
  }

  function selectDark() {
    setVariant("dark");
    if (theme !== "dark") toggleTheme();
  }

  /* ============================================================
     STEP 1 — CRIAÇÃO / ATUALIZAÇÃO DO TENANT
  ============================================================ */
  async function saveStep1() {
    if (!name.trim()) {
      toast.error("Digite um nome válido.");
      return;
    }

    setSaving(true);

    try {
      const userId = profile?.user_id;
      let tenantId = tenant?.id ?? null;

      /* Criar tenant */
      if (!tenantId) {
        tenantId = crypto.randomUUID();

        const { error: errInsert } = await supabase
          .from("tenants")
          .insert({
            id: tenantId,
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false,
            created_by: userId,
          });

        if (errInsert) throw errInsert;

        const updateProfile: any = { tenant_id: tenantId };

        // promove a manager caso não seja owner/manager
        if (profile?.role !== "owner" && profile?.role !== "manager") {
          updateProfile.role = "manager";
        }

        const { error: errProfile } = await supabase
          .from("profiles")
          .update(updateProfile)
          .eq("user_id", userId);

        if (errProfile) throw errProfile;
      }

      /* Atualizar tenant existente */
      else {
        const { error: errUpdate } = await supabase
          .from("tenants")
          .update({
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false,
          })
          .eq("id", tenantId);

        if (errUpdate) throw errUpdate;
      }

      await reloadAll(); // This reloads profile and tenant data from the DB
      setSaving(false);

      /* Avança para o Step 2 */
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar configurações.");
      setSaving(false);
    }
  }

  /* ============================================================
     STEP 2 — REDIRECIONAR PARA CONEXÃO WHATSAPP
  ============================================================ */
  async function goToWhatsAppPage() {
    try {
      // marca setup completo
      if (tenant?.id) {
        await supabase
          .from("tenants")
          .update({ setup_complete: true })
          .eq("id", tenant.id);
      }

      await reloadAll();

      // vai para a tela de conexão real
      navigate("/integracoes/whatsapp", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao avançar.");
    }
  }

  /* ============================================================
     RENDER STEP 1
  ============================================================ */
  function renderStep1() {
    return (
      <>
        <h2 className={styles.title}>Vamos começar criando sua empresa ✨</h2>

        <p className={styles.subtitle}>
          Antes de usar o sistema, vamos configurar sua marca e identidade visual.
        </p>

        <label className={styles.colorLabel}>Nome da sua marca ou salão</label>
        <input
          className={styles.input}
          value={name}
          placeholder="Ex.: Studio da Ana / Carla MEI"
          onChange={(e) => setName(e.target.value)}
        />

        {/* CORES */}
        <div className={styles.colorsSection}>
          <h4 className={styles.sectionTitle}>Personalize o visual da sua marca 🎨</h4>

          <p className={styles.sectionDescription}>
            Essas cores serão usadas no tema, botões e destaques do sistema.
          </p>

          <div className={styles.colorsRow}>
            {/* PRIMÁRIA */}
            <div className={styles.colorItem}>
              <label className={styles.colorLabel}>
                Cor primária
                <span className={styles.colorHint}>Usada em botões e destaques principais.</span>
              </label>

              <input
                type="color"
                className={styles.colorInput}
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
              />

              <p className={styles.colorExample}>Ex.: rosa, azul, roxo…</p>
            </div>

            {/* SECUNDÁRIA */}
            <div className={styles.colorItem}>
              <label className={styles.colorLabel}>
                Cor secundária
                <span className={styles.colorHint}>Usada em fundos e detalhes.</span>
              </label>

              <input
                type="color"
                className={styles.colorInput}
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
              />

              <p className={styles.colorExample}>Geralmente uma cor mais clara.</p>
            </div>
          </div>
        </div>

        {/* TEMA */}
        <div className={styles.themeRow}>
          <button
            className={`${styles.themeBtn} ${variant === "light" ? styles.themeSelected : ""}`}
            onClick={selectLight}
          >
            🌞 Claro
          </button>

          <button
            className={`${styles.themeBtn} ${variant === "dark" ? styles.themeSelected : ""}`}
            onClick={selectDark}
          >
            🌙 Escuro
          </button>
        </div>

        <button className={styles.saveButton} disabled={saving} onClick={saveStep1}>
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </>
    );
  }

  /* ============================================================
     RENDER STEP 2
  ============================================================ */
  function renderStep2() {
    return (
      <>
        <h2 className={styles.title}>Conectar WhatsApp 📲</h2>

        <p className={styles.subtitle}>
          Agora conecte o WhatsApp para habilitar lembretes automáticos e atendimento inteligente.
        </p>

        <div className={styles.infoCard}>
          <p>
            Você será redirecionado para a tela de integração do WhatsApp onde poderá escanear o QR
            Code.
          </p>
        </div>

        <button className={styles.saveButton} onClick={goToWhatsAppPage}>
          Conectar WhatsApp
        </button>
      </>
    );
  }

  /* ============================================================
     RENDER PRINCIPAL
  ============================================================ */
  return (
    <div className={styles.setupContainer}>
      <div className={styles.setupCard}>
        <div className={styles.stepsIndicator}>
          <span className={step === 1 ? styles.activeStep : ""}>1. Empresa</span>
          <span className={step === 2 ? styles.activeStep : ""}>2. WhatsApp</span>
        </div>

        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
}