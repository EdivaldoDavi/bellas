// src/pages/onboarding/steps/StepFirstAppointment.tsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseCleint";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import ModalScheduleWizard from "../../../components/ModalScheduleWizard";
import { toast } from "react-toastify";
import { timeRangeBR, dateBR } from "../../../utils/date";
import { Clock } from "lucide-react";

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
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");

  // ADDED: helper simples para capitalizar nome do cliente
  const formatDisplayName = (name?: string) => {
    if (!name) return "Cliente";
    return name
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join(" ");
  };

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
  setSelectedAppointmentId(mapped.length > 0 ? mapped[0].id : "");
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
              <ul className={styles.appointmentList}>
                {appointments.map((a) => (
                  <li
                    key={a.id}
                    className={`${styles.appointmentItem} ${selectedAppointmentId === a.id ? styles.listItemSelected : ""}`}
                  >
                    {/* LINHA DE DATA + HORÁRIO COM ÍCONE */}
                    <div className={styles.appointmentTimeRow}>
                      <Clock size={18} className={styles.appointmentIcon} />
                      <span className={styles.appointmentTitle}>
                        {dateBR(a.starts_at.slice(0, 10))} — {timeRangeBR(a.starts_at, a.ends_at)}
                      </span>
                    </div>

                    <span className={styles.appointmentService}>
                      {a.service_name} com {a.professional_name}
                    </span>

                    <span className={styles.appointmentClient}>
                      Cliente: <span className={styles.customerBadge}>{formatDisplayName(a.customer_name)}</span>
                    </span>

                  </li>
                ))}
              </ul>
        )}

        {!loading && selectedAppointmentId && (
          <p className={styles.progressText}>
            {(() => {
              const sel = appointments.find(ap => ap.id === selectedAppointmentId);
              return sel
                ? `Agendamento selecionado: ${timeRangeBR(sel.starts_at, sel.ends_at)} — ${sel.service_name} com ${sel.professional_name}`
                : "";
            })()}
          </p>
        )}
      </div>

      {/* BOTÃO DE CRIAÇÃO */}
      <button
        className={styles.stepActionButton}
        onClick={() => setShowWizard(true)}
      >
        Criar agendamento
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