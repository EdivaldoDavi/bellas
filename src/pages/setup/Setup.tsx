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
     LOCAL STATE
  ============================================================ */
  const [step, setStep] = useState<number>(1);

  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#ff1493");
  const [secondary, setSecondary] = useState("#ffffff");
  const [variant, setVariant] = useState<"light" | "dark">("light");

  const [saving, setSaving] = useState(false);

  /* ============================================================
     CARREGAR TENANT E SINCRONIZAR STEP
  ============================================================ */
  useEffect(() => {
    if (!tenant) return;

    // Sincroniza dados
    setName(tenant.name ?? "");
    setPrimary(tenant.primary_color ?? "#ff1493");
    setSecondary(tenant.secondary_color ?? "#ffffff");
    setVariant(tenant.theme_variant ?? "light");

    // Sincroniza passo com onboarding_step
    const stepDB = tenant.onboarding_step ?? 0;

    if (stepDB <= 1) setStep(1);
    else if (stepDB === 2) setStep(2);
    else if (stepDB >= 99) navigate("/dashboard", { replace: true });

  }, [tenant, navigate]);

  /* ============================================================
     PERMISSÃO
  ============================================================ */
  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (!profile) return <p className={styles.error}>Erro: perfil não encontrado.</p>;

  const canAccessSetup =
    profile.role === "owner" ||
    profile.role === "manager" ||
    (profile.role === "professional" && !profile.tenant_id);

  if (!canAccessSetup) {
    return <p className={styles.error}>Você não tem permissão para acessar esta página.</p>;
  }

  /* ============================================================
     TROCA DE TEMA
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
     STEP 1 – CRIAR / ATUALIZAR TENANT
  ============================================================ */
  async function saveStep1() {
    if (name.trim().length < 2) {
      toast.error("Digite um nome válido.");
      return;
    }

    setSaving(true);

    try {
      const userId = profile?.user_id;
      let tenantId = tenant?.id ?? null;

      /* ------------------------------------------
         CRIAR TENANT SE NÃO EXISTE
      ------------------------------------------ */
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
            onboarding_step: 2, // PASSO IMPORTANTE
            created_by: userId,
          });

        if (errInsert) throw errInsert;

        const updateProfile: any = { tenant_id: tenantId };

        // Profissional vira manager ao criar um salão
        if (profile?.role === "professional") {
          updateProfile.role = "manager";
        }

        const { error: errProfile } = await supabase
          .from("profiles")
          .update(updateProfile)
          .eq("user_id", userId);

        if (errProfile) throw errProfile;
      }

      /* ------------------------------------------
         ATUALIZAR TENANT EXISTENTE
      ------------------------------------------ */
      else {
        const { error: errUpdate } = await supabase
          .from("tenants")
          .update({
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false,
            onboarding_step: 2, // Continua no passo 2
          })
          .eq("id", tenantId);

        if (errUpdate) throw errUpdate;
      }

      await reloadAll();
      setStep(2);
      setSaving(false);

    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar configurações.");
      setSaving(false);
    }
  }

  /* ============================================================
     STEP 2 – FINALIZAR E IR PARA CONEXÃO WHATSAPP
  ============================================================ */
  async function goToWhatsAppPage() {
    try {
      if (tenant?.id) {
        await supabase
          .from("tenants")
          .update({
            setup_complete: true,
            onboarding_step: 99,
          })
          .eq("id", tenant.id);
      }

      await reloadAll();
      navigate("/connect-whatsapp", { replace: true });

    } catch (err) {
      console.error(err);
      toast.error("Erro ao avançar.");
    }
  }

  /* ============================================================
     RENDER – STEP 1
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

        <button
          className={styles.saveButton}
          disabled={saving}
          onClick={saveStep1}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </>
    );
  }

  /* ============================================================
     RENDER – STEP 2
  ============================================================ */
  function renderStep2() {
    return (
      <>
        <h2 className={styles.title}>Conectar WhatsApp 📲</h2>

        <p className={styles.subtitle}>
          Agora conecte o número do salão ao sistema para enviar mensagens,
          lembretes e automatizar seu atendimento.
        </p>

        <div className={styles.infoCard}>
          <p>
            Você será redirecionado à página onde poderá escanear o QR Code do WhatsApp.
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

        {/* HEADER DOS STEPS */}
        <div className={styles.stepsIndicator}>
          <span className={step === 1 ? styles.activeStep : ""}>1. Empresa</span>
          <span className={step === 2 ? styles.activeStep : ""}>2. WhatsApp</span>
        </div>

        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
}
