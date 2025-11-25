// src/pages/onboarding/steps/StepServices.tsx
import { useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalNewService from "../../../components/ModalNewService"; // ajuste o caminho

export default function StepServices() {
  const { updateOnboardingStep, tenant } = useUserTenant();
  const [showModal, setShowModal] = useState(true);
  const [, setCreatedSomething] = useState(false);

  const handleClose = () => {
    setShowModal(false);
  };

  const handleSuccess = () => {
    setCreatedSomething(true);
  };

  const handleContinue = () => {
    updateOnboardingStep(3);
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>Cadastre seus serviços principais</h2>
      <p className={styles.stepText}>
        Vamos começar cadastrando alguns serviços, como manicure, corte de
        cabelo, sobrancelha, depilação… Você pode adicionar mais depois.
      </p>

      <p className={styles.stepText}>
        Um modal será aberto para você cadastrar seus serviços. Quando terminar,
        clique em <strong>Continuar</strong>.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Abrir cadastro de serviços
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={handleContinue}
        >
          Já cadastrei / vou cadastrar depois
        </button>
      </div>

      <button
        className={styles.skipBtn}
        onClick={() => updateOnboardingStep(99)}
      >
        Pular todo o onboarding
      </button>

      {tenant?.id && (
        <ModalNewService
          tenantId={tenant.id}
          show={showModal}
          mode="cadastro"      // se existir esse modo, senão remova
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
