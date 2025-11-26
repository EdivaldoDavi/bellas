// src/pages/onboarding/steps/StepFirstAppointment.tsx
import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard"; // ajuste caminho

export default function StepFirstAppointment() {
  const { tenant, updateOnboardingStep } = useUserTenant();
  const [showModal, setShowModal] = useState(false);

  
  

  return (
    <div>
      <h2 className={styles.stepTitle}>Crie seu primeiro agendamento</h2>
      <p className={styles.stepText}>
        Vamos criar um agendamento de teste para você ver a agenda funcionando.
        Depois você pode apagar ou manter normalmente.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
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

      {tenant?.id && (
       <ModalScheduleWizard
        open={showModal}
        tenantId={tenant.id}
        onClose={() => {
            setShowModal(false);
            updateOnboardingStep(99);  // termina o onboarding
        }}
        onBooked={() => {
            updateOnboardingStep(99); // finaliza quando agendar
            setShowModal(false);
        }}
        />

      )}
    </div>
  );
}