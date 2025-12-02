// src/pages/onboarding/steps/StepFirstCustomer.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

import ModalNewCustomer from "../../../components/ModalNewCustomer";

type Customer = {
  id: string;
  full_name: string;
  customer_phone: string | null;
};

export default function StepFirstCustomer() {
  const { tenant, updateOnboardingStep } = useUserTenant();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [createdAtLeastOne, setCreatedAtLeastOne] = useState(false);

  const handleClose = () => setShowModal(false);

  const handleSuccess = async () => {
    await fetchCustomers();
    setCreatedAtLeastOne(true); // cliente criado → libera botão continuar
  };

  function goBack() {
    updateOnboardingStep(2);
  }

  function goNext() {
    if (customers.length === 0) return;
    updateOnboardingStep(4);
  }

  /* ============================================================
     🔥 Buscar clientes existentes
  ============================================================ */
  async function fetchCustomers() {
    if (!tenant?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, customer_phone")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCustomers(data);
      if (data.length > 0) setCreatedAtLeastOne(true);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers();
  }, [tenant?.id]);

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Cadastre um cliente</h2>

      <p className={styles.stepText}>
        Opcional, mas recomendado: cadastre um cliente (pode ser você mesmo) só
        para testar o fluxo de agendamento.
      </p>

      {/* ============================
          LISTA DE CLIENTES EXISTENTES
      ============================= */}
      <div className={styles.listContainer}>
        {loading && <p>Carregando clientes...</p>}

        {!loading && customers.length === 0 && (
          <p className={styles.emptyText}>Nenhum cliente cadastrado ainda.</p>
        )}

        {!loading && customers.length > 0 && (
          <ul className={styles.itemsList}>
            {customers.map((c) => (
              <li key={c.id} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <strong className={styles.itemTitle}>{c.full_name}</strong>
                  {c.customer_phone && (
                    <span className={styles.itemSub}>{c.customer_phone}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ============================
          AÇÕES
      ============================= */}
      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          ← Voltar etapa
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Cadastrar cliente de teste
        </button>
      </div>

      {/* ============================
          BOTÃO CONTINUAR
      ============================= */}
      <div className={styles.footerActions}>
        <button
          className={styles.continueBtn}
          disabled={!createdAtLeastOne}
          onClick={goNext}
        >
          Continuar →
        </button>
      </div>

      {/* ============================
          MODAL
      ============================= */}
      {tenant?.id && (
        <ModalNewCustomer
          mode="agenda"
          tenantId={tenant.id}
          show={showModal}
          onClose={handleClose}
          onSuccess={handleSuccess} // NÃO avança mais automaticamente
        />
      )}
    </div>
  );
}
