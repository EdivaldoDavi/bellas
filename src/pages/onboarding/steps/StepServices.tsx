// src/pages/onboarding/steps/StepServices.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { toast } from "react-toastify";

import styles from "../Onboarding.module.css";
import ModalNewService from "../../../components/ModalNewService";
import { formatCentsToBRL } from "../../../utils/currencyUtils";

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
  price_cents: number | null;
};

export default function StepServices() {
  const { updateOnboardingStep, tenant } = useUserTenant();
  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  /* ============================================================
     🔥 CARREGAR SERVIÇOS EXISTENTES
  ============================================================ */
  async function loadServices() {
    if (!tenant?.id) return;

    setLoadingServices(true);

    const { data, error } = await supabase
      .from("services")
      .select("id, name, duration_min, price_cents")
      .eq("tenant_id", tenant.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar serviços:", error);
      toast.error("Erro ao carregar serviços.");
      setLoadingServices(false);
      return;
    }

    setServices((data || []) as Service[]);
    setLoadingServices(false);
  }

  useEffect(() => {
    loadServices();
  }, [tenant?.id]);

  /* ============================================================
     🔥 VERIFICAR SE EXISTE SERVIÇO PARA CONTINUAR
  ============================================================ */
  async function checkIfHasServices() {
    return services.length > 0;
  }

  const handleContinue = async () => {
    if (!(await checkIfHasServices())) {
      toast.warn("Cadastre pelo menos um serviço antes de continuar.");
      return;
    }

    // Próximo step = Horários (index 2)
    updateOnboardingStep(2);
  };

  /* ============================================================
     🔙 VOLTAR (para o step 0 – boas-vindas)
  ============================================================ */
  function goBack() {
    updateOnboardingStep(0);
  }

  /* ============================================================
     🔥 RENDERIZAÇÃO
  ============================================================ */
  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Cadastre seus serviços principais</h2>

      <p className={styles.stepText}>
        Agora vamos cadastrar os serviços que você oferece, como manicure,
        pedicure, gel, unhas decoradas, alongamentos ou qualquer outro.
      </p>

      {/* LISTA DE SERVIÇOS CADASTRADOS */}
      <div className={styles.servicesListWrapper}>
        <p className={styles.servicesLabel}>Serviços cadastrados:</p>

        {loadingServices ? (
          <p className={styles.stepText}>Carregando serviços...</p>
        ) : services.length === 0 ? (
          <p className={styles.emptyText}>
            Nenhum serviço cadastrado ainda.
          </p>
        ) : (
          <ul className={styles.servicesList}>
            {services.map((s) => (
              <li key={s.id} className={styles.serviceItem}>
                <strong>{s.name}</strong>
                <span>
                  {s.duration_min ?? 0} min —{" "}
                  {formatCentsToBRL(s.price_cents ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* BOTÕES AÇÕES */}
      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          ← Voltar etapa
        </button>

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

      {/* MODAL */}
      {tenant?.id && (
        <ModalNewService
          tenantId={tenant.id}
          show={showModal}
          mode="cadastro"
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadServices(); // 🔥 Recarrega lista
          }}
        />
      )}
    </div>
  );
}
