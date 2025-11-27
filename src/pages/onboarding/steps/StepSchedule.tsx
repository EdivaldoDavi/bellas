// src/pages/onboarding/steps/StepSchedule.tsx
import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

// Agora vamos chamar a página de profissionais como modal
import ProfessionalsPage from "../../ProfessionalsPage";

export default function StepSchedule() {
  const { tenant, updateOnboardingStep } = useUserTenant();
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    setShowModal(false);
    updateOnboardingStep(4); // avança o onboarding ao fechar
  };

  const handleOpen = () => {
    setShowModal(true);
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
        <button className={styles.primaryBtn} onClick={handleOpen}>
          Ajustar horários agora
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={() => updateOnboardingStep(4)}
        >
          Fazer isso depois
        </button>
      </div>

      {tenant?.id && showModal && (
        <ProfessionalsPage onClose={handleClose} />
      )}
    </div>
  );
}
