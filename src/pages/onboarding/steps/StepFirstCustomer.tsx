// src/pages/onboarding/steps/StepFirstCustomer.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import NewCustomerForm from "../../../components/ModalNewCustomer"; // Renomeado
import { dbPhoneToMasked } from "../../../utils/phoneUtils";

type Customer = {
  id: string;
  full_name: string;
  customer_phone: string | null;
};

interface StepFirstCustomerProps {
  onCustomerValidated: (isValid: boolean) => void;
}

export default function StepFirstCustomer({ onCustomerValidated }: StepFirstCustomerProps) {
  const { tenant /*, updateOnboardingStep */ } = useUserTenant(); // Removido updateOnboardingStep

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  // const [canContinue, setCanContinue] = useState(false); // No longer needed here, managed by parent

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");

  const disableAddCustomer = (!loading && customers.length > 0) || Boolean(selectedCustomerId);



  const handleSuccess = useCallback(async () => {
    await fetchCustomers();
    // setCanContinue(true); // No longer needed here
  }, []); // Add fetchCustomers to dependencies if it's not stable

  async function fetchCustomers() {
    if (!tenant?.id) {
      setCustomers([]);
      onCustomerValidated(false); // Update validation state
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, customer_phone")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCustomers(data);
      onCustomerValidated(data.length > 0); // Update validation state

      // Se ainda não houver cliente selecionado, seleciona o primeiro da lista
      if (!selectedCustomerId && data.length > 0) {
        setSelectedCustomerId(data[0].id);
        setSelectedCustomerName(data[0].full_name);
        onCustomerValidated(true);
      }
    } else {
      onCustomerValidated(false); // Update validation state
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers();
  }, [tenant?.id, onCustomerValidated]); // Add onCustomerValidated to dependencies

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
                <ul className={styles.list}>
          {customers.map((c) => (
            <li
              key={c.id}
              className={`${styles.listItem} ${selectedCustomerId === c.id ? styles.listItemSelected : ""}`}
            >
              <div className={styles.itemLeft}>
                <span className={styles.itemTitle}>{c.full_name}</span>
              </div>

              {/* BADGE PREMIUM — TELEFONE FORMATADO */}
              <span className={styles.phoneBadge}>
                {dbPhoneToMasked(c.customer_phone)}
              </span>
            </li>
          ))}
        </ul>
        )}

        {selectedCustomerName && (
          <p className={styles.progressText}>Cliente selecionado: {selectedCustomerName}</p>
        )}
      </div>

      {/* BOTÃO ABRIR MODAL CADASTRO */}
      <button
        className={styles.stepActionButton}
        onClick={() => setShowModal(true)}
        disabled={disableAddCustomer}
      >
        Cadastrar cliente
      </button>

      {tenant?.id && showModal && (
        <div className={styles.warningModalOverlay}> {/* Reutilizando o estilo de overlay */}
          <div className={`${styles.warningModalPremium} ${styles.warningModalTight}`}> {/* Wrapper sem padding */}
            <NewCustomerForm
              mode="new" // Corrigido para "new"
              tenantId={tenant.id}
              onCancel={() => setShowModal(false)}
              onSaveSuccess={(id, name) => {
                // Atualiza lista e seleciona automaticamente o novo cliente
                handleSuccess();
                setSelectedCustomerId(id);
                setSelectedCustomerName(name);
                onCustomerValidated(true);
                setShowModal(false);
              }}
              asModal // faz o form ocupar 100% do wrapper
            />
          </div>
        </div>
      )}
    </div>
  );
}