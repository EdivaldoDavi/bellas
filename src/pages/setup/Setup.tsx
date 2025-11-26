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

  // NOVO → controle de steps
  const [step, setStep] = useState(1);

  /* =============================
     Carregar dados existentes
  ============================== */
  useEffect(() => {
    if (!tenant) return;

    setName(tenant.name ?? "");
    setPrimary(tenant.primary_color ?? "#ff1493");
    setSecondary(tenant.secondary_color ?? "#ffffff");
    setVariant(tenant.theme_variant ?? "light");
  }, [tenant]);

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (!profile)
    return <p className={styles.error}>Erro: perfil não encontrado.</p>;

  // Permissão
  const canAccessSetup =
    profile.role === "owner" ||
    profile.role === "manager" ||
    (profile.role === "professional" && !profile.tenant_id);

  if (!canAccessSetup)
    return (
      <p className={styles.error}>
        Você não tem permissão para acessar esta página.
      </p>
    );

  /* =============================
     SALVAR (Step 1)
  ============================== */
  const saveStep1 = async () => {
    if (name.trim().length < 2) {
      toast.error("Digite um nome válido.");
      return;
    }

    setSaving(true);

    try {
      let currentTenantId = tenant?.id ?? null;
      const currentUserId = profile.user_id;
      const currentRole = profile.role;

      // Criar tenant
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
            setup_complete: false, // Importante → só completa depois do WhatsApp
            created_by: currentUserId,
          })
          .select("*")
          .single();

        if (tenantErr) throw tenantErr;

        currentTenantId = newTenant.id;

        const updatePayload: any = { tenant_id: currentTenantId };
        if (currentRole !== "owner" && currentRole !== "manager") {
          updatePayload.role = "manager";
        }

        const { error: profileErr } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", currentUserId);

        if (profileErr) throw profileErr;

        await reloadAll();
      } else {
        // Atualiza tenant existente
        await supabase
          .from("tenants")
          .update({
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false,
          })
          .eq("id", currentTenantId);
      }

      setSaving(false);

      // Vai para o passo 2
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar dados.");
      setSaving(false);
    }
  };

  /* =============================
     FINALIZAR E IR PARA WHATSAPP
  ============================== */
  const finishAndConnectWhatsapp = async () => {
    try {
      if (tenant) {
        await supabase
          .from("tenants")
          .update({ setup_complete: true })
          .eq("id", tenant.id);
      }

      await reloadAll();

      navigate("/connect-whatsapp", { replace: true });
    } catch (err: any) {
      toast.error("Erro ao avançar.");
    }
  };

  /* =============================
     JSX
  ============================== */
  return (
    <div className={styles.setupContainer}>
      <div className={styles.setupCard}>
        {/* =======================
            STEP HEADER
        ======================== */}
        <div className={styles.stepsIndicator}>
          <span className={step === 1 ? styles.activeStep : ""}>1. Empresa</span>
          <span className={step === 2 ? styles.activeStep : ""}>2. WhatsApp</span>
        </div>

        {/* =======================
            STEP 1 – EMPRESA
        ======================== */}
        {step === 1 && (
          <>
            <h2 className={styles.title}>Vamos começar criando sua empresa ✨</h2>

            <p className={styles.subtitle}>
              Antes de usar o sistema, vamos configurar sua marca e identidade visual.
            </p>

            <label className={styles.colorLabel}>
              Nome da sua marca ou salão
            </label>

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

            {/* Tema */}
            <div className={styles.themeRow}>
              <button
                className={`${styles.themeBtn} ${
                  variant === "light" ? styles.themeSelected : ""
                }`}
                onClick={() => {
                  setVariant("light");
                  if (theme !== "light") toggleTheme();
                }}
              >
                🌞 Claro
              </button>

              <button
                className={`${styles.themeBtn} ${
                  variant === "dark" ? styles.themeSelected : ""
                }`}
                onClick={() => {
                  setVariant("dark");
                  if (theme !== "dark") toggleTheme();
                }}
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
        )}

        {/* =======================
            STEP 2 – WHATSAPP
        ======================== */}
        {step === 2 && (
          <>
            <h2 className={styles.title}>Conectar WhatsApp 📲</h2>

            <p className={styles.subtitle}>
              Agora conecte o número do salão ao sistema para enviar mensagens,
              lembretes e automatizar seu atendimento via WhatsApp.
            </p>

            <div className={styles.infoCard}>
              <p>
                Você será redirecionado para a página de conexão onde verá o QR
                Code do WhatsApp.
              </p>
            </div>

            <button
              className={styles.saveButton}
              onClick={finishAndConnectWhatsapp}
            >
              Conectar WhatsApp
            </button>
          </>
        )}
      </div>
    </div>
  );
}
