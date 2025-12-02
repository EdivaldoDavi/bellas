// src/pages/onboarding/steps/StepSchedule.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { toast } from "react-toastify";

//import { Pencil } from "lucide-react";
import styles from "../Onboarding.module.css";

import ProfessionalsPage from "../../ProfessionalsPage";

export default function StepSchedule() {
  const { tenant, profile, updateOnboardingStep } = useUserTenant();
  const tenantId = tenant?.id;
  const userId = profile?.user_id;

  const [showModal, setShowModal] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);

  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loadingPros, setLoadingPros] = useState(true);

  /* ============================================================
     🔥 CARREGAR PROFISSIONAIS EXISTENTES
  ============================================================ */
  async function loadProfessionals() {
    if (!tenantId) return;

    setLoadingPros(true);

    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, is_active")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      console.error("Erro ao carregar profissionais:", error);
      toast.error("Erro ao carregar profissionais.");
      return;
    }

    setProfessionals(data || []);
    setLoadingPros(false);
  }

  useEffect(() => {
    loadProfessionals();
  }, [tenantId]);

  /* ============================================================
     🔥 VALIDAR HORÁRIOS, PROFISSIONAL E SERVIÇOS
  ============================================================ */
  async function validateAndContinue() {
    if (!tenantId || !userId) return;

    setLoadingCheck(true);

    try {
      // 1️⃣ Profissional cadastrado para o user atual
      const { data: prof } = await supabase
        .from("professionals")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .single();

      if (!prof) {
        toast.error("Profissional não encontrado.");
        return setLoadingCheck(false);
      }

      const professionalId = prof.id;

      // 2️⃣ Serviços vinculados
      const { count: serviceCount } = await supabase
        .from("professional_services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!serviceCount || serviceCount === 0) {
        toast.warn("Você deve vincular ao menos 1 serviço ao profissional.");
        return setLoadingCheck(false);
      }

      // 3️⃣ Horários vinculados
      const { count: scheduleCount } = await supabase
        .from("professional_schedules")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!scheduleCount || scheduleCount === 0) {
        toast.warn("Você deve definir pelo menos 1 horário para o profissional.");
        return setLoadingCheck(false);
      }

      // Tudo certo → avança
      updateOnboardingStep(4);

    } catch (err) {
      console.error(err);
      toast.error("Erro ao validar dados.");
    }

    setLoadingCheck(false);
  }

  /* ============================================================
     🔥 RENDER
  ============================================================ */
  return (
    <div className={styles.stepContainer}>
      
      {/* 🔙 BOTÃO VOLTAR */}
      <button
        className={styles.backBtn}
        onClick={() => updateOnboardingStep(1)}
      >
        ← Voltar etapa
      </button>

      <h2 className={styles.stepTitle}>Escolha o(s) profissionais que irão atender</h2>

      <p className={styles.stepText}>
        Aqui você pode ajustar os horários dos profissionais do Studio. 
        Por padrão, você já foi cadastrado como profissional com horários 
        de 09:00 às 18:00 todos os dias. Se quiser ajustar agora, clique em 
        <strong> Ajustar horários agora</strong>.
      </p>

      {/* ============================================================
          LISTA DE PROFISSIONAIS
      ============================================================ */}
      <div className={styles.servicesListWrapper}>
        <h4 className={styles.servicesLabel}>Profissionais cadastrados:</h4>

        {loadingPros ? (
          <p className={styles.stepText}>Carregando profissionais...</p>
        ) : professionals.length === 0 ? (
          <p className={styles.emptyText}>Nenhum profissional cadastrado ainda.</p>
        ) : (
          <ul className={styles.servicesList}>
            {professionals.map((p) => (
              <li key={p.id} className={styles.serviceItem}>
                <strong>{p.name}</strong>
                <span className={styles.profStatus}>
                  {p.is_active ? "Ativo" : "Inativo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ============================================================
          AÇÕES
      ============================================================ */}
      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Ajustar horários agora
        </button>

        <button
          className={styles.secondaryBtn}
          disabled={loadingCheck}
          onClick={validateAndContinue}
        >
          {loadingCheck ? "Validando..." : "Continuar"}
        </button>
      </div>

      {/* MODAL */}
      {tenantId && showModal && (
        <ProfessionalsPage onClose={() => {
          setShowModal(false);
          loadProfessionals(); // recarregar lista
        }} />
      )}
    </div>
  );
}
