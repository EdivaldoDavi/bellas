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

  const [showWizard, setShowWizard] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // força recarregar lista sempre que um agendamento for criado
  const [reloadFlag, setReloadFlag] = useState(0);

  /* ==========================
     VOLTAR PARA STEP 3
  ============================ */
  function goBack() {
    updateOnboardingStep(3);
  }

  /* ==========================
     CONTINUAR (IR PARA STEP 5)
  ============================ */
  function goNext() {
    if (appointments.length === 0) {
      toast.error("Você precisa criar pelo menos um agendamento de teste.");
      return;
    }

    updateOnboardingStep(5); // ✔ Vai para StepCongratulations
  }

  /* ==========================
     FECHAR MODAL DO WIZARD
  ============================ */
  function handleWizardClose(reason?: "cancel" | "completed") {
  setShowWizard(false);

  if (reason === "completed") {
    // Recarrega lista de agendamentos
    setReloadFlag((v) => v + 1);

    toast.success("Agendamento criado com sucesso!");

    // ✅ NÃO AVANÇA AUTOMATICAMENTE
    // Apenas recarrega a lista e deixa o botão "Continuar →" habilitar o próximo passo
  }
}


  /* ==========================
     CARREGAR AGENDAMENTOS
  ============================ */
  async function fetchAppointments() {
    if (!tenant?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select("id, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar agendamentos.");
    }

    setAppointments(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();
  }, [tenant?.id, reloadFlag]);

  /* ==========================
     UTIL FORMATAR DATA
  ============================ */
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

  /* ==========================
     RENDER
  ============================ */
  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Crie seu primeiro agendamento</h2>

      <p className={styles.stepText}>
        Vamos criar um agendamento de teste para você ver como a agenda funciona
        na prática.
      </p>

      <div className={styles.listContainer}>
        {loading && <p>Carregando agendamentos...</p>}

        {!loading && appointments.length === 0 && (
          <p>Nenhum agendamento criado ainda.</p>
        )}

        {!loading && appointments.length > 0 && (
          <ul className={styles.itemsList}>
            {appointments.map((a) => (
              <li key={a.id} className={styles.itemRow}>
                <div className={styles.itemLine}>
                  <span className={styles.itemTitle}>
                    {formatDateTime(a.created_at)}
                  </span>
                  <span className={styles.itemSub}> — Agendamento criado</span>
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

        <button
          className={styles.primaryBtn}
          onClick={() => setShowWizard(true)}
        >
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

      {/* ==========================
         MODAL DO WIZARD
      ============================ */}
      {tenant?.id && (
        <ModalScheduleWizard
          open={showWizard}
          tenantId={tenant.id}
          onClose={handleWizardClose}
        />
      )}
    </div>
  );
}
