// src/pages/onboarding/steps/StepServices.tsx
import { useState } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { toast } from "react-toastify";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalNewService from "../../../components/ModalNewService";

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

  /* ============================================================
     ⚠ IMPEDE CONTINUAR SE NÃO HOUVER SERVIÇOS CADASTRADOS
  ============================================================ */
  async function handleContinue() {
    if (!tenant?.id) return;

    const { data, error } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenant.id)
      .limit(1);

    if (error) {
      console.error("Erro ao verificar serviços:", error);
      toast.error("Erro ao verificar serviços.");
      return;
    }

    if (!data || data.length === 0) {
      toast.warn("Por favor, cadastre pelo menos um serviço.");
      return;
    }

    // Tudo certo → avançar
    updateOnboardingStep(3);
  }

  return (
    <div>
      <h2 className={styles.stepTitle}>Cadastre seus serviços principais</h2>
      <p className={styles.stepText}>
        Vamos começar cadastrando alguns serviços, como manicure, unha em gel,
        cílios... Você pode adicionar mais depois.
      </p>

      <p className={styles.stepText}>
        Um modal será aberto para você cadastrar seus serviços,
        <strong> Importante!</strong> cadastre pelo menos um serviço.
        Quando terminar, clique em <strong>Continuar</strong>.
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
          mode="cadastro"
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
