import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard";
import { toast } from "react-toastify";

type Appointment = {
  id: string;
  created_at: string;
};

export default function StepFirstAppointment() {
  const { tenant, updateOnboardingStep } = useUserTenant();

  const [showWizard, setShowWizard] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // GATILHO PARA FORÇAR RELOAD
  const [reloadFlag, setReloadFlag] = useState(0);

  function goBack() {
    updateOnboardingStep(3);
  }

  function goNext() {
    if (appointments.length === 0) {
      toast.error("Por favor, crie pelo menos um agendamento.");
      return;
    }
    updateOnboardingStep(99); // <-- AJUSTE O STEP DO CONGRATULATIONS AQUI!
  }

  async function fetchAppointments() {
    if (!tenant?.id) return;

    setLoading(true);

    const { data } = await supabase
      .from("appointments")
      .select("id, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (data) setAppointments(data);

    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();
  }, [tenant?.id, reloadFlag]); // <-- atualiza sempre

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Crie seu primeiro agendamento</h2>

      <p className={styles.stepText}>
        Vamos criar um agendamento de teste para você ver a agenda funcionando.
      </p>

      <div className={styles.listContainer}>
        {loading && <p>Carregando agendamentos...</p>}

        {!loading && appointments.length === 0 && (
          <p>Nenhum agendamento cadastrado ainda.</p>
        )}

        {!loading && appointments.length > 0 && (
          <ul className={styles.itemsList}>
            {appointments.map((a) => (
              <li key={a.id} className={styles.itemRow}>
                <div className={styles.itemLine}>
                  <span className={styles.itemTitle}>
                    {formatDateTime(a.created_at)}
                  </span>
                  <span className={styles.itemSub}>— Agendamento criado</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          Voltar
        </button>

        <button className={styles.primaryBtn} onClick={() => setShowWizard(true)}>
          Criar agendamento de teste
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={goNext}
          disabled={appointments.length === 0}
        >
          Continuar →
        </button>
      </div>

      {tenant?.id && (
        <ModalScheduleWizard
          open={showWizard}
          tenantId={tenant.id}
          onClose={(reason) => {
            setShowWizard(false);
            setReloadFlag((v) => v + 1); // força reload da lista

            if (reason === "completed") {
              toast.success("Agendamento criado com sucesso!");
            }
          }}
        />
      )}
    </div>
  );
}
