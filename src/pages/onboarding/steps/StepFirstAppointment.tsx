import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard";

export default function StepFirstAppointment() {
  const { tenant, updateOnboardingStep } = useUserTenant();

  const [showFirstAppointment, setShowFirstAppointment] = useState(false);

  function handleBack() {
    updateOnboardingStep(4); // ← volta para etapa anterior (horários)
  }

  function finishStep() {
    updateOnboardingStep(99);
  }

  return (
    <div className={styles.stepContainer}>
      {/* TÍTULO */}
      <h2 className={styles.stepTitle}>Crie seu primeiro agendamento</h2>

      <p className={styles.stepText}>
        Vamos criar um agendamento de teste para você ver a agenda funcionando.
        Depois você pode cancelar ou manter normalmente.
      </p>

      {/* LISTA DE BOTÕES */}
      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowFirstAppointment(true)}
        >
          Criar agendamento de teste
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={() => finishStep()}
        >
          Pular, já fiz um agendamento
        </button>

        {/* 🔙 BOTÃO VOLTAR ETAPA */}
        <button
          className={styles.backButton}
          onClick={handleBack}
        >
          ← Voltar etapa
        </button>
      </div>

      {/* MODAL */}
      {tenant?.id && (
        <ModalScheduleWizard
          open={showFirstAppointment}
          tenantId={tenant.id}
          onClose={(reason) => {
            if (reason === "completed") {
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
