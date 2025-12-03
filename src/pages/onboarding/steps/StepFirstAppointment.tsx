// src/pages/onboarding/steps/StepFirstAppointment.tsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard";
import { toast } from "react-toastify";

type Appointment = {
  id: string;
  created_at: string;
};

interface StepFirstAppointmentProps {
  onAppointmentValidated: (isValid: boolean) => void;
}

export default function StepFirstAppointment({ onAppointmentValidated }: StepFirstAppointmentProps) {
  const { tenant /*, updateOnboardingStep */ } = useUserTenant(); // Removido updateOnboardingStep

  const [showWizard, setShowWizard] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // força recarregar lista sempre que um agendamento for criado
  const [reloadFlag, setReloadFlag] = useState(0);

  /* ==========================
     FECHAR MODAL DO WIZARD
  ============================ */
  const handleWizardClose = useCallback((reason?: "cancel" | "completed") => {
    setShowWizard(false);

    if (reason === "completed") {
      // Recarrega lista de agendamentos
      setReloadFlag((v) => v + 1);

      toast.success("Agendamento criado com sucesso!");

      // ✅ NÃO AVANÇA AUTOMATICAMENTE
      // Apenas recarrega a lista e deixa o botão "Continuar →" habilitar o próximo passo
    }
  }, []);


  /* ==========================
     CARREGAR AGENDAMENTOS
  ============================ */
  async function fetchAppointments() {
    if (!tenant?.id) {
      setAppointments([]);
      onAppointmentValidated(false); // Update validation state
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select("id, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar agendamentos.");
      setAppointments([]);
      onAppointmentValidated(false); // Update validation state
    } else {
      setAppointments(data || []);
      onAppointmentValidated((data || []).length > 0); // Update validation state
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();
  }, [tenant?.id, reloadFlag, onAppointmentValidated]); // Add onAppointmentValidated to dependencies

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

      {/* BOTÕES */}
      {/* The navigation buttons are now handled by OnboardingFixedNavigation */}
      <button
        className={styles.stepActionButton} // Apply new style
        onClick={() => setShowWizard(true)}
      >
        Criar agendamento de teste
      </button>

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