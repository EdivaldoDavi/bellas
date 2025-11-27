// src/pages/setup/Setup.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

import { useUserTenant } from "../../context/UserTenantProvider";
import { useTheme } from "../../hooks/useTheme";

import styles from "./Setup.module.css";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConnectWhatsAppPage from "../ConnectWhatsAppPage"; // Step 2 embutido

export default function Setup() {
  const { loading: userTenantLoading, profile, tenant, reloadAll } =
    useUserTenant();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ============================================================
     STEPS INTERNOS DO SETUP (via URL ?step=1|2)
  ============================================================ */
  const currentStep = Number(searchParams.get("step")) || 1;

  const setStep = useCallback(
    (stepNumber: 1 | 2) => {
      setSearchParams({ step: String(stepNumber) });
    },
    [setSearchParams]
  );

  /* ============================================================
     FORM STATE (inicializa com tenant se existir)
  ============================================================ */
  const [name, setName] = useState(() => tenant?.name || "");
  const [primary, setPrimary] = useState(
    () => tenant?.primary_color || "#ff1493"
  );
  const [secondary, setSecondary] = useState(
    () => tenant?.secondary_color || "#ffffff"
  );
  const [variant, setVariant] = useState<"light" | "dark">(
    () => tenant?.theme_variant || "light"
  );

  const [saving, setSaving] = useState(false);

  /* ============================================================
     SINCRONIZA CAMPOS QUANDO O TENANT CARREGAR/ATUALIZAR
  ============================================================ */
  useEffect(() => {
    if (!tenant) return;

    setName(tenant.name || "");
    setPrimary(tenant.primary_color || "#ff1493");
    setSecondary(tenant.secondary_color || "#ffffff");
    setVariant((tenant.theme_variant as "light" | "dark") || "light");
  }, [tenant]);

  /* ============================================================
     PERMISSÕES / LOADING
  ============================================================ */
  if (userTenantLoading) {
    return <LoadingSpinner message="Carregando configurações..." />;
  }

  if (!profile) {
    return <p className={styles.error}>Erro: perfil não encontrado.</p>;
  }

  const canAccessSetup =
    profile.role === "owner" ||
    profile.role === "manager" ||
    (!profile.tenant_id && profile.role === "professional");

  if (!canAccessSetup) {
    return (
      <p className={styles.error}>
        Você não tem permissão para acessar o setup.
      </p>
    );
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
     STEP 1 — CRIAR / ATUALIZAR TENANT + GARANTIR PROFESSIONAL
  ============================================================ */
  async function saveStep1() {
    if (!name.trim()) {
      toast.error("Digite um nome válido.");
      return;
    }

    if (!profile) {
      toast.error("Perfil não encontrado.");
      return;
    }

    setSaving(true);

    try {
      const currentUserId = profile.user_id;
      let currentTenantId = tenant?.id ?? null;

      // 1️⃣ Criar tenant (primeira vez)
      if (!currentTenantId) {
        const generatedId = crypto.randomUUID();

        const { data: newTenant, error: errInsert } = await supabase
          .from("tenants")
          .insert({
            id: generatedId,
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false, // só termina no final do step 2
            created_by: currentUserId,
          })
          .select("*")
          .single();

        if (errInsert) throw errInsert;

        currentTenantId = newTenant.id;

        // Atualiza o perfil com o tenant e, se necessário, promove para manager
        const updateProfile: any = { tenant_id: currentTenantId };

        if (profile.role !== "owner" && profile.role !== "manager") {
          updateProfile.role = "manager";
        }

        const { error: errProfile } = await supabase
          .from("profiles")
          .update(updateProfile)
          .eq("user_id", currentUserId);

        if (errProfile) throw errProfile;

        // 🔄 Atualiza JWT e contexto (importante para RLS que usa tenant_id no token)
        await supabase.auth.refreshSession();
        await reloadAll();
      }
      // 2️⃣ Atualizar tenant existente
      else {
        const canUpdateTenant =
          profile.role === "owner" || profile.role === "manager";

        if (!canUpdateTenant) {
          toast.error("Você não pode alterar estes dados.");
          setSaving(false);
          return;
        }

        const { error: errUpdate } = await supabase
          .from("tenants")
          .update({
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false, // continua falso até finalizar o step 2
          })
          .eq("id", currentTenantId);

        if (errUpdate) throw errUpdate;
      }

      // 3️⃣ Garante que exista um PROFESSIONAL para este usuário + tenant
      if (currentTenantId) {
        const { data: existingProfessional, error: profSelectErr } =
          await supabase
            .from("professionals")
            .select("id")
            .eq("tenant_id", currentTenantId)
            .eq("user_id", currentUserId)
            .maybeSingle();

        if (profSelectErr) throw profSelectErr;

        if (!existingProfessional) {
          const { error: profInsertErr } = await supabase
            .from("professionals")
            .insert({
              tenant_id: currentTenantId,
              user_id: currentUserId,
              name: profile.full_name,
              email: profile.email || null,
              is_active: true,
            });

          if (profInsertErr) throw profInsertErr;
        }
      }

      await reloadAll();

      // 👉 Avança para o passo 2 (WhatsApp dentro do setup)
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     STEP 2 — FINALIZAR APÓS CONECTAR WHATSAPP
  ============================================================ */
  async function finishAfterWhatsApp() {
    try {
      if (tenant?.id) {
        await supabase
          .from("tenants")
          .update({ setup_complete: true })
          .eq("id", tenant.id);
      }

      await reloadAll();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao finalizar configuração.");
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
          Antes de usar o sistema, vamos configurar sua marca e identidade
          visual.
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
          <h4 className={styles.sectionTitle}>
            Personalize o visual da sua marca 🎨
          </h4>

          <p className={styles.sectionDescription}>
            Essas cores serão usadas no tema, botões e destaques do sistema.
          </p>

          <div className={styles.colorsRow}>
            {/* PRIMÁRIA */}
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

              <p className={styles.colorExample}>Ex.: rosa, azul, roxo…</p>
            </div>

            {/* SECUNDÁRIA */}
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

        {/* TEMA */}
        <div className={styles.themeRow}>
          <button
            className={`${styles.themeBtn} ${
              variant === "light" ? styles.themeSelected : ""
            }`}
            onClick={selectLight}
          >
            🌞 Claro
          </button>

          <button
            className={`${styles.themeBtn} ${
              variant === "dark" ? styles.themeSelected : ""
            }`}
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
     RENDER STEP 2 (WhatsApp embutido)
  ============================================================ */
  function renderStep2() {
    return (
      <>
        <h2 className={styles.title}>Conectar WhatsApp 📲</h2>

        <p className={styles.subtitle}>
          Conecte o WhatsApp do seu salão para habilitar lembretes automáticos,
          confirmações e atendimento inteligente.
        </p>

        <div style={{ marginTop: "24px" }}>
          <ConnectWhatsAppPage />
        </div>

        <button
          className={styles.saveButton}
          style={{ marginTop: "24px" }}
          onClick={finishAfterWhatsApp}
        >
          Finalizar configuração
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
          <span className={currentStep === 1 ? styles.activeStep : ""}>
            1. Empresa
          </span>
          <span className={currentStep === 2 ? styles.activeStep : ""}>
            2. WhatsApp
          </span>
        </div>

        {currentStep === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
}
