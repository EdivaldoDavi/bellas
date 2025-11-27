import { useState  } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { supabase } from "../../../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../Onboarding.module.css";

import ProfessionalsPage from "../../ProfessionalsPage";

export default function StepSchedule() {
  const { tenant, profile, updateOnboardingStep } = useUserTenant();
  const tenantId = tenant?.id;
  const userId = profile?.user_id;

  const [showModal, setShowModal] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);

  async function validateAndContinue() {
    if (!tenantId || !userId) return;

    setLoadingCheck(true);

    try {
      // 1️⃣ Verifica se o usuário tem profissional
      const { data: prof } = await supabase
        .from("professionals")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .single();

      if (!prof) {
        toast.error("Profissional não encontrado.");
        setLoadingCheck(false);
        return;
      }

      const professionalId = prof.id;

      // 2️⃣ Verifica serviços
      const { count: serviceCount } = await supabase
        .from("professional_services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!serviceCount || serviceCount === 0) {
        toast.warn("Você deve selecionar ao menos 1 serviço.");
        setLoadingCheck(false);
        return;
      }

      // 3️⃣ Verifica horários
      const { count: scheduleCount } = await supabase
        .from("professional_schedules")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!scheduleCount || scheduleCount === 0) {
        toast.warn("Você deve definir ao menos 1 horário.");
        setLoadingCheck(false);
        return;
      }

      // Tudo certo → avança
      updateOnboardingStep(4);

    } catch (err) {
      console.error(err);
      toast.error("Erro ao validar dados.");
    }

    setLoadingCheck(false);
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>Defina seus horários de atendimento</h2>

      <p className={styles.stepText}>
        Agora vamos configurar os horários em que você irá atender.
      </p>

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

      {tenantId && showModal && (
        <ProfessionalsPage onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
