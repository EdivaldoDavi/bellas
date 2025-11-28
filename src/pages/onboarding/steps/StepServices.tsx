// src/pages/onboarding/steps/StepServices.tsx
import { useState } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { toast } from "react-toastify";

import styles from "../Onboarding.module.css";
import ModalNewService from "../../../components/ModalNewService";

export default function StepServices() {
  const { updateOnboardingStep, tenant } = useUserTenant();
  
  // 🔥 Agora começa fechado (antes começava true)
  const [showModal, setShowModal] = useState(false);

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
        Agora vamos cadastrar os serviços que você oferece, como manicure,
        pedicure, gel, unhas decoradas, alongamentos ou qualquer outro.
      </p>

      <p className={styles.stepText}>
        Você poderá adicionar quantos quiser depois, mas para seguir, precisa ter
        ao menos <strong>um serviço</strong> cadastrado.
      </p>

      <div className={styles.actions}>
        {/* 🔥 Agora o modal só abre quando o usuário pede */}
        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Cadastrar serviço
        </button>

        <button className={styles.secondaryBtn} onClick={handleContinue}>
          Continuar
        </button>
      </div>

      {tenant?.id && (
        <ModalNewService
          tenantId={tenant.id}
          show={showModal}
          mode="cadastro"
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
