// src/pages/onboarding/steps/StepSchedule.tsx
import { useState } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { toast } from "react-toastify";
import styles from "../Onboarding.module.css";

import ProfessionalsPage from "../../ProfessionalsPage";

export default function StepSchedule() {
  const { tenant, updateOnboardingStep, profile } = useUserTenant();
  const [showModal, setShowModal] = useState(true);
  const tenantId = tenant?.id;

  /* ============================================================
     ⚠️ Verifica requisitos antes de avançar
  ============================================================ */
  async function canContinue() {
    if (!tenantId || !profile?.user_id) return false;

    // 1) Verifica se existe pelo menos 1 serviço
    const { data: services } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1);

    if (!services || services.length === 0) {
      toast.warn("Cadastre pelo menos um serviço antes de continuar.");
      return false;
    }

    // 2) Verifica se existe pelo menos 1 horário cadastrado (para qualquer profissional)
    const { data: schedules } = await supabase
      .from("professional_schedules")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1);

    if (!schedules || schedules.length === 0) {
      toast.warn("Defina pelo menos um horário de atendimento antes de continuar.");
      return false;
    }

    return true;
  }

  /* ============================================================
     BOTÃO: Fazer isso depois
  ============================================================ */
  async function handleContinueLater() {
    if (await canContinue()) {
      updateOnboardingStep(4);
    }
  }

  /* ============================================================
     FECHAR MODAL (somente se já cadastrou horário)
  ============================================================ */
  async function handleCloseModal() {
    setShowModal(false);

    if (await canContinue()) {
      updateOnboardingStep(4);
    }
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>Defina seus horários de atendimento</h2>

      <p className={styles.stepText}>
        Agora vamos configurar os horários em que você (ou o profissional 
        principal) irá atender. Isso garante que a agenda só permita 
        agendamentos em horários válidos.
      </p>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={() => setShowModal(true)}>
          Ajustar horários agora
        </button>

        <button className={styles.secondaryBtn} onClick={handleContinueLater}>
          Fazer isso depois
        </button>
      </div>

      {tenantId && showModal && (
        <ProfessionalsPage onClose={handleCloseModal} />
      )}
    </div>
  );
}
