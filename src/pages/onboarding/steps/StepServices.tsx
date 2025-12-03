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
  const { updateOnboardingStep, tenant, profile, loading: userTenantLoading, reloadAll } = useUserTenant();
  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  console.log("StepServices Component Render: profile?.professional_id =", profile?.professional_id, "tenant?.id =", tenant?.id, "userTenantLoading =", userTenantLoading);

  /* ============================================================
     🔥 CARREGAR SERVIÇOS EXISTENTES
  ============================================================ */
  async function loadServices() {
    console.log("loadServices: Called. Current tenant.id:", tenant?.id, "profile.professional_id:", profile?.professional_id);
    setLoadingServices(true);

    if (!tenant?.id) {
      console.log("loadServices: tenant.id é nulo ou indefinido. Definindo services como vazio e loading como false.");
      setServices([]);
      setLoadingServices(false);
      return;
    }

    try {
      console.log("loadServices: Fetching services for tenant.id:", tenant.id);
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration_min, price_cents")
        .eq("tenant_id", tenant.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("loadServices: Erro ao carregar serviços:", error);
        toast.error("Erro ao carregar serviços.");
        setServices([]);
      } else {
        console.log("loadServices: Serviços carregados:", data);
        setServices((data || []) as Service[]);
      }
    } catch (err) {
      console.error("loadServices: Erro inesperado em loadServices:", err);
      toast.error("Erro inesperado ao carregar serviços.");
      setServices([]);
    } finally {
      console.log("loadServices: Finalizando carregamento de serviços. Setting loadingServices to false.");
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    console.log("StepServices useEffect for loadServices triggered. tenant.id:", tenant?.id, "profile?.professional_id:", profile?.professional_id, "userTenantLoading:", userTenantLoading);
    // Chamar loadServices apenas quando o tenant.id estiver disponível e o carregamento do contexto tiver terminado
    if (!userTenantLoading && tenant?.id) {
      loadServices();
    } else if (!userTenantLoading && !tenant?.id) {
      // Se o contexto carregou mas não há tenant.id, garante que o loadingServices seja false
      setLoadingServices(false);
      setServices([]);
    }
  }, [tenant?.id, userTenantLoading]);

  /* ============================================================
     🔥 VERIFICAR SE EXISTE SERVIÇO PARA CONTINUAR
  ============================================================ */
  async function checkIfHasServices() {
    return services.length > 0;
  }

  const handleContinue = async () => {
    console.log("handleContinue: profile?.professional_id =", profile?.professional_id);
    if (!(await checkIfHasServices())) {
      toast.warn("Cadastre pelo menos um serviço antes de continuar.");
      return;
    }

    console.log("StepServices: Continuing to step 2 (Schedule). Current tenant onboarding_step:", tenant?.onboarding_step);
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
          Voltar
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
          // O botão não será desabilitado aqui, a lógica de associação é no modal
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
          isFromOnboarding={true}
          onClose={() => setShowModal(false)}
          onSuccess={async () => {
            setShowModal(false);
            await loadServices(); // Recarrega lista de serviços
            await reloadAll(); // Força o recarregamento completo do contexto para atualizar professional_id
            console.log("StepServices: ModalNewService closed, reloading services and full context.");
          }}
        />
      )}
    </div>
  );
}