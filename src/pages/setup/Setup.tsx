// src/pages/setup/Setup.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

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
  const [name, setName] = useState(() => tenant?.name || "");

  // NOVOS CAMPOS
  const [studioPhone, setStudioPhone] = useState(
    () => tenant?.whatsapp_number || ""
  );
  const [personalPhone, setPersonalPhone] = useState("");

  const [primary, setPrimary] = useState(
    () => tenant?.primary_color || "#8343A2"
  );
  const [secondary, setSecondary] = useState(
    () => tenant?.secondary_color || "#e0b6f5"
  );
  const [variant, setVariant] = useState<"light" | "dark">(
    () => tenant?.theme_variant || "light"
  );

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
    setVariant((tenant.theme_variant as "light" | "dark") || "light");
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
      toast.error("Telefone do Studio inválido.");
      return;
    }

    if (!isValidMaskedPhone(personalPhone)) {
      toast.error("Telefone pessoal inválido.");
      return;
    }

    const dbStudioPhone = maskedToDbPhone(studioPhone);
    const dbPersonalPhone = maskedToDbPhone(personalPhone);

    if (!dbStudioPhone || !dbPersonalPhone)
      return toast.error("Verifique os telefones informados.");

    setSaving(true);

    try {
      const userId = profile?.user_id;
      let tenantId = tenant?.id ?? null;

      /* ============================================================
         1) CRIAR TENANT CASO NÃO EXISTA
      ============================================================ */
      if (!tenantId) {
        tenantId = crypto.randomUUID();

        const { error: errInsert } = await supabase.from("tenants").insert({
          id: tenantId,
          name,
          whatsapp_number: dbStudioPhone,
          primary_color: primary,
          secondary_color: secondary,
          theme_variant: variant,
          setup_complete: false,
          created_by: userId,
        });

        if (errInsert) throw errInsert;

        // Atualiza o profile com tenant_id
        const updateProfile: any = { tenant_id: tenantId };
        if (profile?.role !== "owner" && profile?.role !== "manager") {
          updateProfile.role = "manager";
        }

        await supabase
          .from("profiles")
          .update(updateProfile)
          .eq("user_id", userId);

        await supabase.auth.refreshSession();
        await reloadAll();
      } else {
        /* ============================================================
           2) ATUALIZAR TENANT EXISTENTE
        ============================================================ */
        const allowed =
          profile?.role === "owner" || profile?.role === "manager";

        if (!allowed) {
          toast.error("Você não pode alterar estes dados.");
          setSaving(false);
          return;
        }

        const { error: errUpdate } = await supabase
          .from("tenants")
          .update({
            name,
            whatsapp_number: dbStudioPhone,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false,
          })
          .eq("id", tenantId);

        if (errUpdate) throw errUpdate;
      }

      /* ============================================================
         3) CRIAR OU ATUALIZAR PROFESSIONAL
      ============================================================ */
      const { data: existingProfessional, error: selectErr } = await supabase
        .from("professionals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", profile?.user_id)
        .maybeSingle();

      if (selectErr) throw selectErr;

      let professionalId = existingProfessional?.id ?? null;

      if (!professionalId) {
        const { data: newProf, error: newErr } = await supabase
          .from("professionals")
          .insert({
            tenant_id: tenantId,
            user_id: profile?.user_id,
            name: profile?.full_name,
            email: profile?.email,
            phone: dbPersonalPhone,
            is_active: true,
          })
          .select("*")
          .single();

        if (newErr) throw newErr;

        professionalId = newProf.id;
      } else {
        const { error: updateErr } = await supabase
          .from("professionals")
          .update({ phone: dbPersonalPhone })
          .eq("id", professionalId);

        if (updateErr) throw updateErr;
      }

      /* ============================================================
         4) INSERIR HORÁRIOS PADRÃO
      ============================================================ */
      if (professionalId) {
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
      }

      await reloadAll();
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
          placeholder="Ex.: Studio da Ana / Carla MEI"
          onChange={(e) => setName(e.target.value)}
        />

        {/* TELEFONE DO STUDIO */}
      <div className={styles.labelWithIcon}>
  <label className={styles.colorLabel}>Telefone do Studio (WhatsApp)</label>

          <span className={styles.helpIcon}>
            <HelpCircle size={16} />
            <span className={styles.tooltip}>
              Este será o número usado para automação, confirmações e lembretes.
            </span>
          </span>
        </div>

        <input
          className={styles.input}
          value={formatPhoneInput(studioPhone)}
          placeholder="(11) 99999-8888"
          onChange={(e) => setStudioPhone(formatPhoneInput(e.target.value))}
        />

        {/* TELEFONE PESSOAL */}
     <div className={styles.labelWithIcon}>
            <label className={styles.colorLabel}>Seu telefone pessoal</label>

          <span className={styles.helpIcon}>
            <HelpCircle size={16} />
            <span className={styles.tooltip}>
             É o mesmo número que você usa para a empresa/profissional ou pessoal? Se sim, basta preenchê-lo novamente.
            </span>
          </span>
        </div>

        <input
          className={styles.input}
          value={formatPhoneInput(personalPhone)}
          placeholder="(11) 98888-7777"
          onChange={(e) => setPersonalPhone(formatPhoneInput(e.target.value))}
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

        {/* BOTÃO SALVAR */}
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
