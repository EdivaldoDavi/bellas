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
  const { updateOnboardingStep, tenant, profile, loading: userTenantLoading } = useUserTenant();
  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  /* ============================================================
     🔥 CARREGAR SERVIÇOS EXISTENTES
  ============================================================ */
  async function loadServices() {
    setLoadingServices(true); // Sempre inicia o carregamento

    if (!tenant?.id) {
      console.log("loadServices: tenant.id é nulo, pulando busca de serviços.");
      setServices([]); // Limpa os serviços se não houver tenant
      setLoadingServices(false); // Garante que o loading seja false
      return;
    }

    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration_min, price_cents")
        .eq("tenant_id", tenant.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar serviços:", error);
        toast.error("Erro ao carregar serviços.");
        setServices([]);
      } else {
        setServices((data || []) as Service[]);
      }
    } catch (err) {
      console.error("Erro inesperado em loadServices:", err);
      toast.error("Erro inesperado ao carregar serviços.");
      setServices([]);
    } finally {
      setLoadingServices(false); // Sempre finaliza o carregamento
    }
  }

  useEffect(() => {
    console.log("StepServices useEffect triggered. tenant.id:", tenant?.id, "profile.professional_id:", profile?.professional_id, "userTenantLoading:", userTenantLoading);
    // A condição para chamar loadServices deve depender principalmente de tenant.id e do estado de carregamento do contexto.
    // profile.professional_id é relevante para habilitar o botão 'Cadastrar serviço', não para carregar os serviços existentes.
    if (!userTenantLoading) { // Só executa se o contexto de usuário/tenant terminou de carregar
      loadServices();
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
  const canAddService = !userTenantLoading && !!profile?.professional_id;
  console.log("StepServices: canAddService=", canAddService);

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
          disabled={!canAddService} // Desabilita se não puder adicionar serviço
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
          onSuccess={() => {
            setShowModal(false);
            loadServices(); // 🔥 Recarrega lista
            console.log("StepServices: ModalNewService closed, reloading services.");
          }}
        />
      )}
    </div>
  );
}