// src/pages/onboarding/steps/StepSchedule.tsx
import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalNewProfessional from "../../../components/ModalNewProfessional"; // ajuste caminho

export default function StepSchedule() {
  const { tenant, updateOnboardingStep } = useUserTenant();
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    setShowModal(false);
  };

  const handleSuccess = () => {
    updateOnboardingStep(4);
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>Defina seus horários de atendimento</h2>
      <p className={styles.stepText}>
        Agora vamos configurar os horários em que você (ou o profissional
        principal) irá atender. Isso garante que a agenda só permita
        agendamentos em horários válidos.
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
          onClick={() => updateOnboardingStep(4)}
        >
          Fazer isso depois
        </button>
      </div>
{/*
      <button
        className={styles.skipBtn}
        onClick={() => updateOnboardingStep(99)}
      >
        Pular todo o onboarding
      </button>
*/}
      {tenant?.id && (
        <ModalNewProfessional
          tenantId={tenant.id}
          show={showModal}
          mode="agenda"
          onClose={handleClose}
          onSuccess={() =>
            handleSuccess()
          } // você pode receber (id, name) se quiser
         
        />
      )}
    </div>
  );
}