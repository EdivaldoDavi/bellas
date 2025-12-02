// src/pages/onboarding/steps/StepFirstCustomer.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

import ModalNewCustomer from "../../../components/ModalNewCustomer";
import { Pencil, Plus } from "lucide-react";

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

  const handleClose = () => setShowModal(false);

  const handleSuccess = async () => {
    await fetchCustomers();
    updateOnboardingStep(4); // próxima etapa
  };

  function goBack() {
    updateOnboardingStep(2); // volta etapa
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
          <p className={styles.emptyText}>
            Nenhum cliente cadastrado ainda.
          </p>
        )}

        {!loading && customers.length > 0 && (
          <ul className={styles.itemsList}>
            {customers.map((c) => (
              <li key={c.id} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <strong>{c.full_name}</strong>
                  {c.customer_phone && (
                    <span className={styles.itemSub}>
                      {c.customer_phone}
                    </span>
                  )}
                </div>
                <Pencil size={18} className={styles.itemIcon} />
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
          <Plus size={18} /> Cadastrar cliente de teste
        </button>
      </div>

      {/* ============================
          MODAL DE NOVO CLIENTE
      ============================= */}
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
