import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

import { applyTenantTheme } from "../../utils/theme";
import { useUserTenant } from "../../context/UserTenantProvider";

import styles from "./Setup.module.css";
import LoadingSpinner from "../../components/LoadingSpinner";
import { HelpCircle } from "lucide-react";

import {
  maskedToDbPhone,
  formatPhoneInput,
  isValidMaskedPhone,
} from "../../utils/phoneUtils";

export default function Setup() {
  const { loading: loadingUserTenant, profile, tenant, reloadAll } =
    useUserTenant();
  const navigate = useNavigate();

  /* ============================================================
     FORM STATE
  ============================================================ */
  const [name, setName] = useState(tenant?.name || "");

  const [studioPhone, setStudioPhone] = useState(
    tenant?.whatsapp_number || ""
  );
  const [personalPhone, setPersonalPhone] = useState("");

  const [primary, setPrimary] = useState(tenant?.primary_color || "#8343A2");
  const [secondary, setSecondary] = useState(
    tenant?.secondary_color || "#e0b6f5"
  );
  // 🚨 Removido o estado de `variant` dinâmico, agora é fixo para 'light'
  // const [variant, setVariant] = useState<"light" | "dark">(
  //   tenant?.theme_variant || "light"
  // );

  const [saving, setSaving] = useState(false);

  /* ============================================================
     SYNC TENANT WHEN LOADED
  ============================================================ */
  useEffect(() => {
    if (!tenant) return;

    setName(tenant.name || "");
    setStudioPhone(tenant.whatsapp_number || "");
    setPrimary(tenant.primary_color || "#8343A2");
    setSecondary(tenant.secondary_color || "#e0b6f5");
    // setVariant(tenant.theme_variant || "light"); // Removido
  }, [tenant]);

  /* ============================================================
     PERMISSIONS
  ============================================================ */
  if (loadingUserTenant) {
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
     SALVAR SETUP
  ============================================================ */
  async function saveSetup() {
    if (!name.trim()) return toast.error("Digite um nome válido.");

    if (!isValidMaskedPhone(studioPhone)) {
      return toast.error("Telefone do Studio inválido.");
    }

    if (!isValidMaskedPhone(personalPhone)) {
      return toast.error("Telefone pessoal inválido.");
    }

    const dbStudio = maskedToDbPhone(studioPhone);
    const dbPersonal = maskedToDbPhone(personalPhone);

    setSaving(true);

    try {
      const userId = profile?.user_id;
      let tenantId = tenant?.id ?? null;

      /* ============================================================
         1) CRIAR TENANT SE NÃO EXISTIR
      ============================================================ */
      if (!tenantId) {
        tenantId = crypto.randomUUID();

        const { error } = await supabase.from("tenants").insert({
          id: tenantId,
          name,
          whatsapp_number: dbStudio,
          primary_color: primary,
          secondary_color: secondary,
          theme_variant: "light", // 🚨 Fixo para 'light'
          onboarding_step: 0,
          setup_complete: false,
          created_by: userId,
        });

        if (error) throw error;

        // Atualizar profile
        const updateProfile: any = { tenant_id: tenantId };
        if (profile?.role !== "owner" && profile?.role !== "manager") {
          updateProfile.role = "manager";
        }

        await supabase
          .from("profiles")
          .update(updateProfile)
          .eq("user_id", userId);

        await supabase.auth.refreshSession();
      } else {
        /* ============================================================
           2) ATUALIZAR TENANT EXISTENTE
        ============================================================ */
        const { error } = await supabase
          .from("tenants")
          .update({
            name,
            whatsapp_number: dbStudio,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: "light", // 🚨 Fixo para 'light'
            setup_complete: false,
          })
          .eq("id", tenantId);

        if (error) throw error;
      }

      /* ============================================================
         3) CRIAR / ATUALIZAR PROFESSIONAL
      ============================================================ */
      const { data: existingProf } = await supabase
        .from("professionals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", profile?.user_id)
        .maybeSingle();

      let professionalId = existingProf?.id;

      if (!professionalId) {
        const { data, error } = await supabase
          .from("professionals")
          .insert({
            tenant_id: tenantId,
            user_id: profile?.user_id,
            name: profile?.full_name,
            email: profile?.email,
            phone: dbPersonal,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        professionalId = data.id;
      }

      /* ============================================================
         4) INSERIR HORÁRIOS PADRÃO
      ============================================================ */
      await supabase
        .from("professional_schedules")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      const rows = Array.from({ length: 7 }).map((_, idx) => ({
        tenant_id: tenantId!,
        professional_id: professionalId!,
        weekday: idx + 1,
        start_time: "09:00",
        end_time: "18:00",
        break_start_time: "00:00",
        break_end_time: "00:00",
      }));

      await supabase.from("professional_schedules").insert(rows);

      /* ============================================================
         5) RECARREGAR TENANT + APLICAR TEMA IMEDIATAMENTE
      ============================================================ */
      await reloadAll(); // AGORA ESPERA AQUI!

      applyTenantTheme({
        primary_color: primary,
        secondary_color: secondary,
        theme_variant: "light", // 🚨 Passa 'light' explicitamente
      });

      /* ============================================================
         6) IR PARA ONBOARDING
      ============================================================ */
      navigate("/onboarding", { replace: true });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className={styles.setupContainer}>
      <div className={styles.setupCard}>
        <h2 className={styles.title}>Vamos começar criando sua empresa ✨</h2>

        <p className={styles.subtitle}>
          Configure sua marca, telefone e identidade visual.
        </p>

        {/* NOME */}
        <label className={styles.colorLabel}>Nome da sua marca ou Studio</label>
        <input
          className={styles.input}
          value={name}
          placeholder="Ex.: Studio da Ana"
          onChange={(e) => setName(e.target.value)}
        />

        {/* WHATSAPP */}
        <div className={styles.labelWithIcon}>
          <label className={styles.colorLabel}>Telefone do Studio</label>
          <span className={styles.helpIcon}>
            <HelpCircle size={16} />
            <span className={styles.tooltip}>
              Usado para confirmações automáticas.
            </span>
          </span>
        </div>

        <input
          className={styles.input}
          value={formatPhoneInput(studioPhone)}
          onChange={(e) => setStudioPhone(formatPhoneInput(e.target.value))}
          placeholder="(11) 99999-8888"
        />

        {/* TELEFONE PESSOAL */}
        <div className={styles.labelWithIcon}>
          <label className={styles.colorLabel}>Seu telefone pessoal</label>
        </div>

        <input
          className={styles.input}
          value={formatPhoneInput(personalPhone)}
          onChange={(e) => setPersonalPhone(formatPhoneInput(e.target.value))}
          placeholder="(11) 98888-7777"
        />

        {/* CORES */}
        <div className={styles.colorsSection}>
          <h4 className={styles.sectionTitle}>Cores da sua marca 🎨</h4>

          <div className={styles.colorsRow}>
            <div className={styles.colorItem}>
              <label className={styles.colorLabel}>Cor primária</label>
              <input
                type="color"
                className={styles.colorInput}
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
              />
            </div>

            <div className={styles.colorItem}>
              <label className={styles.colorLabel}>Cor secundária</label>
              <input
                type="color"
                className={styles.colorInput}
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* BOTÃO */}
        <button
          className={styles.saveButton}
          disabled={saving}
          onClick={saveSetup}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </div>
    </div>
  );
}