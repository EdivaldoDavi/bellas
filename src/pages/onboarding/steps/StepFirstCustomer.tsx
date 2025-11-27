// src/pages/onboarding/steps/StepFirstCustomer.tsx
import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalNewCustomer from "../../../components/ModalNewCustomer"; // ajuste caminho

export default function StepFirstCustomer() {
  const { tenant, updateOnboardingStep } = useUserTenant();
  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);

  const handleSuccess = () => {
    updateOnboardingStep(5);
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>Cadastre um cliente</h2>
      <p className={styles.stepText}>
        Opcional, mas recomendado: cadastre um cliente (pode ser você mesmo) só
        para testar o fluxo de agendamento.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Cadastrar cliente de teste
        </button>
{/*
        <button
          className={styles.secondaryBtn}
          onClick={() => updateOnboardingStep(5)}
        >
          Pular este passo
        </button>
        */}
      </div>

      {tenant?.id && (
        <ModalNewCustomer
          mode = "agenda"
          tenantId={tenant.id}
          show={showModal}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
