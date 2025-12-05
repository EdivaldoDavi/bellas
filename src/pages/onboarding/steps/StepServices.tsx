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

interface StepServicesProps {
  onServicesValidated: (isValid: boolean) => void;
}

export default function StepServices({ onServicesValidated }: StepServicesProps) {
  const { tenant, profile, loading: userTenantLoading } = useUserTenant();
  const [showModal, setShowModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  // ADDED: nome do serviço selecionado derivado
  const selectedServiceName = services.find(s => s.id === selectedServiceId)?.name || "";

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
      onServicesValidated(false); // Update validation state
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
        onServicesValidated(false); // Update validation state
      } else {
        console.log("loadServices: Serviços carregados:", data);
        setServices((data || []) as Service[]);
        onServicesValidated((data || []).length > 0); // Update validation state
        // Define um serviço "selecionado" visualmente (primeiro da lista) se houver
        setSelectedServiceId((data && data.length > 0) ? data[0].id : "");
      }
    } catch (err) {
      console.error("loadServices: Erro inesperado em loadServices:", err);
      toast.error("Erro inesperado ao carregar serviços.");
      setServices([]);
      onServicesValidated(false); // Update validation state
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
      onServicesValidated(false); // Update validation state
    }
  }, [tenant?.id, userTenantLoading, onServicesValidated]); // Add onServicesValidated to dependencies

  /* ============================================================
     🔥 RENDERIZAÇÃO
  ============================================================ */
  const disableAddService = !loadingServices && (services.length > 0);

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
                  <ul className={styles.list}>
          {services.map(s => (
            <li key={s.id} className={`${styles.listItem} ${selectedServiceId === s.id ? styles.listItemSelected : ""}`}>
              <span className={styles.itemTitle}>{s.name}</span>

              <span className={styles.itemMeta}>
                <span className={`${styles.badge} ${styles.badgeDuration}`}>
                  {s.duration_min} min
                </span>

                <span className={`${styles.badge} ${styles.badgePrice}`}>
                  {formatCentsToBRL(s.price_cents)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        )}
      </div>

      {/* ADDED: texto informando serviço selecionado */}
      {selectedServiceId && selectedServiceName && (
        <p className={styles.progressText}>Serviço selecionado: {selectedServiceName}</p>
      )}

      {/* BOTÕES AÇÕES */}
      {/* The navigation buttons are now handled by OnboardingFixedNavigation */}
      <button
        className={styles.stepActionButton}
        onClick={() => setShowModal(true)}
        disabled={disableAddService}
      >
        Cadastrar serviço
      </button>

      {/* MODAL */}
      {tenant?.id && (
        <ModalNewService
          tenantId={tenant.id}
          show={showModal}
          mode="cadastro"
          isFromOnboarding={true}
          onClose={() => setShowModal(false)}
          onSuccess={async (id, name, duration) => {
            // Igual ao StepFirstCustomer: recarrega lista e seleciona o criado
            await loadServices();
            setSelectedServiceId(id);
            onServicesValidated(true);
            setShowModal(false);
            // REMOVED: reloadAll para evitar refresh completo do contexto
            console.log("StepServices: Serviço criado, lista recarregada e serviço selecionado:", { id, name, duration });
          }}
          
        />
      )}
    </div>
  );
}