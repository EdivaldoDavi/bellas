import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard";

export default function StepFirstAppointment() {
  const { tenant, updateOnboardingStep } = useUserTenant();

  // Controla o modal (Estado CORRETO)
  const [showFirstAppointment, setShowFirstAppointment] = useState(false);

  // Finalizar esse passo do onboarding
  function finishStep() {
    updateOnboardingStep(99); // próxima etapa / finaliza onboarding
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>Crie seu primeiro agendamento</h2>

      <p className={styles.stepText}>
        Vamos criar um agendamento de teste para você ver a agenda funcionando.
        Depois você pode cancelar ou manter normalmente.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowFirstAppointment(true)}
        >
          Criar agendamento de teste
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={() => updateOnboardingStep(99)}
        >
          Pular, já entendi
        </button>
      </div>

      {/* MODAL DO AGENDAMENTO */}
      {tenant?.id && (
        <ModalScheduleWizard
          open={showFirstAppointment}
          tenantId={tenant.id}
          onClose={(reason) => {
            if (reason === "completed") {
              // Usuário concluiu o agendamento → avança onboarding
              finishStep();
            } else {
              // Apenas fechou o modal → não encerra onboarding
              setShowFirstAppointment(false);
            }
          }}
        />
      )}
    </div>
  );
}
