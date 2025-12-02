// src/pages/onboarding/steps/StepFirstCustomer.tsx
import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalNewCustomer from "../../../components/ModalNewCustomer";

export default function StepFirstCustomer() {
  const { tenant, updateOnboardingStep } = useUserTenant();
  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);

  const handleSuccess = () => {
    // Próxima etapa = StepFirstAppointment (4)
    updateOnboardingStep(4);
  };

  function goBack() {
    // Volta para StepSchedule (2)
    updateOnboardingStep(2);
  }

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Cadastre um cliente</h2>
      <p className={styles.stepText}>
        Opcional, mas recomendado: cadastre um cliente (pode ser você mesmo) só
        para testar o fluxo de agendamento.
      </p>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          ← Voltar etapa
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Cadastrar cliente de teste
        </button>
      </div>

      {tenant?.id && (
        <ModalNewCustomer
          mode="agenda"
          tenantId={tenant.id}
          show={showModal}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
