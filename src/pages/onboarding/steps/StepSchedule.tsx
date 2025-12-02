// src/pages/onboarding/steps/StepSchedule.tsx
import { useEffect, useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { supabase } from "../../../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../Onboarding.module.css";

import ProfessionalsPage from "../../ProfessionalsPage";

type Professional = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function StepSchedule() {
  const { tenant, profile, updateOnboardingStep } = useUserTenant();
  const tenantId = tenant?.id;
  const userId = profile?.user_id;

  const [showModal, setShowModal] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);

  // 🔥 Carregar profissionais
  useEffect(() => {
    async function loadProfessionals() {
      if (!tenantId) return;

      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, is_active")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) {
        console.error(error);
        toast.error("Erro ao carregar profissionais.");
        return;
      }

      setProfessionals((data || []) as Professional[]);
    }

    loadProfessionals();
  }, [tenantId]);

  function goBack() {
    // ← volta para StepServices (1)
    updateOnboardingStep(1);
  }

  async function validateAndContinue() {
    if (!tenantId || !userId) return;

    setLoadingCheck(true);

    try {
      const { data: prof } = await supabase
        .from("professionals")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!prof) {
        toast.error("Profissional não encontrado.");
        setLoadingCheck(false);
        return;
      }

      const professionalId = prof.id;

      const { count: serviceCount } = await supabase
        .from("professional_services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!serviceCount || serviceCount === 0) {
        toast.warn(
          "Você deve selecionar ao menos 1 serviço para o profissional."
        );
        setLoadingCheck(false);
        return;
      }

      const { count: scheduleCount } = await supabase
        .from("professional_schedules")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!scheduleCount || scheduleCount === 0) {
        toast.warn(
          "Você deve definir ao menos 1 horário para o profissional."
        );
        setLoadingCheck(false);
        return;
      }

      // tudo certo → próximo step (3 = StepFirstCustomer)
      updateOnboardingStep(3);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao validar dados.");
    }

    setLoadingCheck(false);
  }

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Escolha o(s) profissionais que irão atender</h2>

      <p className={styles.stepText}>
        Aqui você pode ajustar os horários dos profissionais do Studio. Por padrão,
        você já foi cadastrado como profissional com horários de 09:00 às 18:00.
      </p>

      <h4 className={styles.stepTitle}>Profissionais cadastrados:</h4>
      {professionals.length === 0 ? (
        <p className={styles.emptyText}>Nenhum profissional cadastrado ainda.</p>
      ) : (
        <ul className={styles.servicesList}>
          {professionals.map((p) => (
            <li key={p.id} className={styles.serviceItem}>
              <strong>{p.name}</strong>
              <span>{p.is_active ? "Ativo" : "Inativo"}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          ← Voltar etapa
        </button>

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
