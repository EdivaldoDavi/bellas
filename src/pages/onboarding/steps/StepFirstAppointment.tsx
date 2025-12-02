// src/pages/onboarding/steps/StepFirstAppointment.tsx
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

  const [showFirstAppointment, setShowFirstAppointment] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  function finishStep() {
    updateOnboardingStep(99); // finaliza onboarding
  }

  function goBack() {
    // Volta para StepFirstCustomer (3)
    updateOnboardingStep(3);
  }

  /* ============================================================
     🔥 Buscar agendamentos existentes
  ============================================================ */
  async function fetchAppointments() {
    if (!tenant?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select("id, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar agendamentos:", error);
      setAppointments([]);
    } else if (data) {
      setAppointments(data as Appointment[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();
  }, [tenant?.id]);

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleContinue() {
    if (appointments.length === 0) {
      toast.error("Por favor, crie pelo menos um agendamento.");
      return;
    }
    finishStep();
  }

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Crie seu primeiro agendamento</h2>

      <p className={styles.stepText}>
        Vamos criar um agendamento de teste para você ver a agenda funcionando.
        Depois você pode cancelar ou manter normalmente.
      </p>

      {/* ============================
          LISTA DE AGENDAMENTOS
      ============================= */}
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

      {/* ============================
          BOTÕES (PADRÃO DOS STEPS)
      ============================= */}
      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          Voltar
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => setShowFirstAppointment(true)}
        >
          Criar agendamento de teste
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={handleContinue}
          disabled={appointments.length === 0}
        >
          Continuar →
        </button>
      </div>

      {tenant?.id && (
        <ModalScheduleWizard
          open={showFirstAppointment}
          tenantId={tenant.id}
          onClose={(reason) => {
            if (reason === "completed") {
              setShowFirstAppointment(false);
              fetchAppointments(); // recarrega lista após concluir
              toast.success("Agendamento criado com sucesso!");
            } else {
              setShowFirstAppointment(false);
            }
          }}
        />
      )}
    </div>
  );
}
