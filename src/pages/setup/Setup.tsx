// src/pages/setup/Setup.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseCleint";
import { toast } from "react-toastify";

import { useUserTenant } from "../../context/UserTenantProvider";
import styles from "./Setup.module.css";
import LoadingSpinner from "../../components/LoadingSpinner";

import {
  maskedToDbPhone,
  formatPhoneInput,
  isValidMaskedPhone,
} from "../../utils/phoneUtils";

export default function Setup() {
  const { loading: userTenantLoading, profile, tenant, reloadAll } =
    useUserTenant();
  const navigate = useNavigate();

  /* ============================================================
     FORM STATE
  ============================================================ */
  const [name, setName] = useState(() => tenant?.name || "");
  const [phone, setPhone] = useState("");
  const [primary, setPrimary] = useState(
    () => tenant?.primary_color || "#8343A2"
  );
  const [secondary, setSecondary] = useState(
    () => tenant?.secondary_color || "rgba(224, 182, 245, 1)"
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
    setPrimary(tenant.primary_color || "#8343A2");
    setSecondary(tenant.secondary_color || "#ffffff");
    setVariant((tenant.theme_variant as "light" | "dark") || "light");
  }, [tenant]);

  /* ============================================================
     PERMISSIONS / LOADING
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
     SALVAR SETUP (SOMENTE ETAPA ÚNICA)
  ============================================================ */
  async function saveSetup() {
    if (!name.trim()) return toast.error("Digite um nome válido.");

    if (!isValidMaskedPhone(phone)) {
      toast.error("Informe um telefone válido.");
      return;
    }

    const dbPhone = maskedToDbPhone(phone);
    if (!dbPhone) return toast.error("Telefone inválido.");

    if (!profile) return toast.error("Perfil não encontrado.");

    setSaving(true);

    try {
      const currentUserId = profile.user_id;
      let currentTenantId = tenant?.id ?? null;

      /* ============================================================
         1) CRIAR TENANT CASO NÃO EXISTA
      ============================================================ */
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
            setup_complete: false,
            created_by: currentUserId,
          })
          .select("*")
          .single();

        if (errInsert) throw errInsert;

        currentTenantId = newTenant.id;

        // Atualizar o profile com tenant_id
        const updateProfile: any = { tenant_id: currentTenantId };

        if (profile.role !== "owner" && profile.role !== "manager") {
          updateProfile.role = "manager";
        }

        await supabase
          .from("profiles")
          .update(updateProfile)
          .eq("user_id", currentUserId);

        await supabase.auth.refreshSession();
        await reloadAll();
      } else {
        /* ============================================================
           2) ATUALIZAR TENANT EXISTENTE
        ============================================================ */
        const allowed =
          profile.role === "owner" || profile.role === "manager";
        if (!allowed)
          return toast.error("Você não pode alterar estes dados.");

        const { error: errUpdate } = await supabase
          .from("tenants")
          .update({
            name,
            primary_color: primary,
            secondary_color: secondary,
            theme_variant: variant,
            setup_complete: false,
          })
          .eq("id", currentTenantId);

        if (errUpdate) throw errUpdate;
      }

      /* ============================================================
         3) CRIAR/ATUALIZAR PROFESSIONAL
      ============================================================ */
      const { data: existingProfessional } = await supabase
        .from("professionals")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .eq("user_id", profile.user_id)
        .maybeSingle();

      let professionalId = existingProfessional?.id ?? null;

      if (!professionalId) {
        const { data: newProfessional, error: profErr } = await supabase
          .from("professionals")
          .insert({
            tenant_id: currentTenantId,
            user_id: profile.user_id,
            name: profile.full_name,
            email: profile.email,
            phone: dbPhone,
            is_active: true,
          })
          .select("*")
          .single();

        if (profErr) throw profErr;

        professionalId = newProfessional.id;
      } else {
        await supabase
          .from("professionals")
          .update({ phone: dbPhone })
          .eq("id", professionalId)
          .eq("tenant_id", currentTenantId);
      }

      /* ============================================================
         4) INSERIR HORÁRIOS PADRÃO
      ============================================================ */
      if (professionalId) {
        await supabase
          .from("professional_schedules")
          .delete()
          .eq("tenant_id", currentTenantId)
          .eq("professional_id", professionalId);

        const rows = Array.from({ length: 7 }).map((_, idx) => ({
          tenant_id: currentTenantId,
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

      // FINAL -> vai para onboarding!
      navigate("/onboarding", { replace: true });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar setup.");
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
          Antes de usar o sistema, vamos configurar sua marca e identidade visual.
        </p>

        {/* NOME */}
        <label className={styles.colorLabel}>Nome da sua marca ou Studio</label>
        <input
          className={styles.input}
          value={name}
          placeholder="Ex.: Studio da Ana / Carla MEI"
          onChange={(e) => setName(e.target.value)}
        />

        {/* TELEFONE */}
        <label className={styles.colorLabel}>Telefone profissional</label>
        <input
          className={styles.input}
          value={formatPhoneInput(phone)}
          placeholder="(11) 98765-4321"
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
        />

        {/* CORES */}
        <div className={styles.colorsSection}>
          <h4 className={styles.sectionTitle}>
            Personalize o visual da sua marca 🎨
          </h4>

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
        <button className={styles.saveButton} disabled={saving} onClick={saveSetup}>
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
      </div>
    </div>
  );
}
