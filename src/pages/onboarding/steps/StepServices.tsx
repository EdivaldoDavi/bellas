// src/pages/onboarding/steps/StepServices.tsx
import { useState } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { toast } from "react-toastify";

import styles from "../Onboarding.module.css";
import ModalNewService from "../../../components/ModalNewService";

export default function StepServices() {
  const { updateOnboardingStep, tenant } = useUserTenant();
  const [showModal, setShowModal] = useState(true);
  const [, setCreatedSomething] = useState(false);

  const handleClose = () => setShowModal(false);

  const handleSuccess = () => {
    setCreatedSomething(true);
    setShowModal(false);
  };

  async function checkIfHasServices() {
    if (!tenant?.id) return false;

    const { data, error } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenant.id)
      .limit(1);

    if (error) {
      console.error("Erro ao verificar serviços:", error);
      toast.error("Erro ao verificar serviços cadastrados.");
      return false;
    }

    return data.length > 0;
  }

  const handleContinue = async () => {
    const hasServices = await checkIfHasServices();

    if (!hasServices) {
      toast.warn("Por favor, cadastre pelo menos um serviço.");
      return;
    }

    updateOnboardingStep(3);
  };

  return (
    <div>
      <h2 className={styles.stepTitle}>Cadastre seus serviços principais</h2>

      <p className={styles.stepText}>
        Vamos começar cadastrando seus serviços principais como manicure, unha em gel,
        extensão de cílios… Você poderá adicionar mais depois.
      </p>

      <p className={styles.stepText}>
        Cadastre pelo menos um serviço para continuar.
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
          Continuar
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
        <ModalNewService
          tenantId={tenant.id}
          show={showModal}
          mode="cadastro"
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
