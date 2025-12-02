// src/pages/onboarding/steps/StepFirstAppointment.tsx
import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard";

export default function StepFirstAppointment() {
  const { tenant, updateOnboardingStep } = useUserTenant();
  const [showFirstAppointment, setShowFirstAppointment] = useState(false);

  function goBack() {
    updateOnboardingStep(4); // volta para StepFirstCustomer
  }

  function finishStep() {
    updateOnboardingStep(99); // finaliza onboarding
  }

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Crie seu primeiro agendamento</h2>

      <p className={styles.stepText}>
        Vamos criar um agendamento de teste para você ver a agenda funcionando.
        Depois você pode cancelar ou manter normalmente.
      </p>

      <div className={styles.actions}>
        <button className={styles.tertiaryBtn} onClick={goBack}>
          ← Voltar etapa
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => setShowFirstAppointment(true)}
        >
          Criar agendamento de teste
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={finishStep}
        >
          Pular, já fiz um agendamento
        </button>
      </div>

      {/* MODAL DO AGENDAMENTO */}
      {tenant?.id && (
        <ModalScheduleWizard
          open={showFirstAppointment}
          tenantId={tenant.id}
          onClose={(reason) => {
            if (reason === "completed") {
              setShowFirstAppointment(false);
              finishStep();
            } else {
              setShowFirstAppointment(false);
            }
          }}
        />
      )}
    </div>
  );
}
