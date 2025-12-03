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
  const { updateOnboardingStep, tenant, profile, loading: userTenantLoading, reloadAll } = useUserTenant(); // Adicionado reloadAll
  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  /* ============================================================
     🔥 CARREGAR SERVIÇOS EXISTENTES
  ============================================================ */
  async function loadServices() {
    console.log("loadServices: Called. Current tenant.id:", tenant?.id, "loadingServices state:", loadingServices);
    setLoadingServices(true); // Sempre inicia o carregamento

    if (!tenant?.id) {
      console.log("loadServices: tenant.id é nulo ou indefinido. Definindo services como vazio e loading como false.");
      setServices([]); // Limpa os serviços se não houver tenant
      setLoadingServices(false); // Garante que o loading seja false
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
      setLoadingServices(false); // Sempre finaliza o carregamento
    }
  }

  useEffect(() => {
    console.log("StepServices useEffect triggered. tenant.id:", tenant?.id, "profile.professional_id:", profile?.professional_id, "userTenantLoading:", userTenantLoading);
    // A condição para chamar loadServices deve depender principalmente de tenant.id e do estado de carregamento do contexto.
    // profile.professional_id é relevante para habilitar o botão 'Cadastrar serviço', não para carregar os serviços existentes.
    if (!userTenantLoading && tenant?.id) { // Só executa se o contexto de usuário/tenant terminou de carregar E o tenant.id está disponível
      loadServices();
    } else if (!userTenantLoading && !tenant?.id) {
      // Se o contexto carregou mas não há tenant.id, garante que o loadingServices seja false
      setLoadingServices(false);
      setServices([]);
    }
  }, [tenant?.id, userTenantLoading]); // Removido profile?.professional_id das dependências para loadServices

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

    console.log("StepServices: Continuando para o step 2 (Schedule). Current tenant onboarding_step:", tenant?.onboarding_step);
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
  // O botão "Cadastrar serviço" não precisa ser desabilitado, pois o ModalNewService já lida com a associação
  // const canAddService = !userTenantLoading && !!profile?.professional_id;
  // console.log("StepServices: canAddService=", canAddService);

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
          // disabled={!canAddService} // Removido o disabled para permitir adicionar múltiplos serviços
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
          isFromOnboarding={true} // Passa a nova prop aqui
          onClose={() => setShowModal(false)}
          onSuccess={async () => { // Adicionado async aqui
            setShowModal(false);
            await loadServices(); // 🔥 Recarrega lista
            await reloadAll(); // 🔥 Força o recarregamento completo do contexto
            console.log("StepServices: ModalNewService closed, reloading services and full context.");
          }}
        />
      )}
    </div>
  );
}