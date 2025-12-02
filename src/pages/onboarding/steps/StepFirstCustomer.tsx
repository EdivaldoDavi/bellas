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
  const [canContinue, setCanContinue] = useState(false);

  const handleClose = () => setShowModal(false);

  const handleSuccess = async () => {
    await fetchCustomers();
    setCanContinue(true);
  };

  function goBack() {
    updateOnboardingStep(2);
  }

  function goNext() {
    if (!canContinue) return;
    updateOnboardingStep(4);
  }

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
      if (data.length > 0) setCanContinue(true);
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

      {/* LISTA DE CLIENTES */}
      <div className={styles.listContainer}>
        {loading && <p>Carregando clientes...</p>}

        {!loading && customers.length === 0 && (
          <p>Nenhum cliente cadastrado ainda.</p>
        )}

        {!loading && customers.length > 0 && (
          <ul className={styles.itemsList}>
            {customers.map((c) => (
              <li key={c.id} className={styles.itemRow}>
                <div className={styles.itemLine}>
                  <span className={styles.itemTitle}>{c.full_name}</span>
                  {c.customer_phone && (
                    <span className={styles.itemSub}>
                      — {c.customer_phone}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* BOTÕES NA MESMA LINHA (PADRÃO) */}
      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          Voltar
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Cadastrar cliente
        </button>

        <button
          className={styles.secondaryBtn}
          disabled={!canContinue}
          onClick={goNext}
        >
          Continuar →
        </button>
      </div>

      {tenant?.id && (
        <ModalNewCustomer
          mode="agenda"
          tenantId={tenant.id}
          show={showModal}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
