// src/pages/onboarding/steps/StepFirstAppointment.tsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard";
import { toast } from "react-toastify";
import { timeRangeBR } from "../../../utils/date";

/* ============================================================
   TIPAGEM DO AGENDAMENTO
============================================================ */
export type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;

  service_name?: string;
  professional_name?: string;
  customer_name?: string;

  avatar_url?: string;
};


interface StepFirstAppointmentProps {
  onAppointmentValidated: (isValid: boolean) => void;
}

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
export default function StepFirstAppointment({
  onAppointmentValidated,
}: StepFirstAppointmentProps) {
  const { tenant } = useUserTenant();

  const [showWizard, setShowWizard] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadFlag, setReloadFlag] = useState(0);

  /* ============================================================
     FECHAR O WIZARD
  ============================================================ */
  const handleWizardClose = useCallback((reason?: "cancel" | "completed") => {
    setShowWizard(false);

    if (reason === "completed") {
      setReloadFlag((v) => v + 1);
      toast.success("Agendamento criado com sucesso!");
    }
  }, []);

  /* ============================================================
     CARREGAR AGENDAMENTOS
  ============================================================ */
async function fetchAppointments() {
  if (!tenant?.id) {
    setAppointments([]);
    onAppointmentValidated(false);
    return;
  }

  setLoading(true);

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id, starts_at, ends_at, status,
      service:services(name),
      professional:professionals(name),
      customer:customers(full_name)
    `)
    .eq("tenant_id", tenant.id)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Erro supabase:", error);
    toast.error("Erro ao carregar agendamentos.");
    setAppointments([]);
    onAppointmentValidated(false);
    setLoading(false);
    return;
  }

  const mapped: Appointment[] = (data || []).map((a: any) => ({
    id: a.id,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    status: a.status,

    service_name: a.service?.name || "Serviço",
    professional_name: a.professional?.name || "Profissional",
    customer_name: a.customer?.full_name || "Cliente",
  }));

  setAppointments(mapped);
  onAppointmentValidated(mapped.length > 0);
  setLoading(false);
}

  useEffect(() => {
    fetchAppointments();
  }, [tenant?.id, reloadFlag]);

  /* ============================================================
     RENDER
  ============================================================ */
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
          <ul className={styles.list}>
            {appointments.map((a) => (
                <li key={a.id} className={styles.listItem}>
                  <div className={styles.appointmentText}>
                    <span className={styles.itemTitle}>
                      {timeRangeBR(a.starts_at, a.ends_at)}
                    </span>

                    <span className={styles.itemSub}>
                      {a.service_name} com {a.professional_name}
                    </span>

                    <span className={styles.itemSub}>
                      Cliente: {a.customer_name}
                    </span>
                  </div>
                </li>
            ))}
          </ul>
        )}
      </div>

      {/* BOTÃO DE CRIAÇÃO */}
      <button
        className={styles.stepActionButton}
        onClick={() => setShowWizard(true)}
      >
        Criar agendamento de teste
      </button>

      {/* MODAL */}
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
