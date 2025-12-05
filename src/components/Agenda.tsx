/** AGENDA — CLEAN VERSION FINAL **/

import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";

import DatePickerAgenda from "../components/DatePickerAgenda";

import ModalCalendar from "./ModalCalendar";
import ModalScheduleTimes from "./ModalScheduletimes";

import ModalSelectProfessional from "./ModalSelectProfessional";
import ModalScheduleWizard from "../components/ModalScheduleWizard";

import NewCustomerForm from "../components/ModalNewCustomer"; // Renomeado
import ModalNewService from "../components/ModalNewService";
import ModalNewProfessional from "../components/ModalNewProfessional";

import { useTheme } from "../hooks/useTheme";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { toLocalISOString, isHoliday } from "../utils/date";

import { getAvailableTimeSlots } from "../utils/schedule"; // Importa a nova função

import { ChevronLeft, ChevronRight, Plus, CheckSquare  } from "lucide-react"; // Importar CheckSquare e Square
import styles from "../css/Agenda.module.css";

import { supabase } from "../lib/supabaseCleint";

interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;

  service_name?: string;
  professional_name?: string;
  customer_name?: string;

  avatar_url?: string;
}

export default function Agenda() {
  const { profile, tenant } = useUserAndTenant();
  const { theme } = useTheme();

  // 🚨 DEBUG: Log do perfil e tenant na Agenda
  console.log("Agenda: profile", profile);
  console.log("Agenda: tenant", tenant);

  const tenantId = profile?.tenant_id ?? null;
  const role = profile?.role ?? null;

  // 🔥 NOVO: Usa o professional_id do perfil se o usuário for um profissional
  const loggedInProfessionalId = profile?.role === "professional" ? profile.professional_id : null;

  /* DATA */
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  /* MODAIS */
  const [showWizard, setShowWizard] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimes, setShowTimes] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showNewProfessional, setShowNewProfessional] = useState(false);

  /* CAMPOS PARA DATAS DISPONÍVEIS */
  // 🔥 NOVO: Inicializa professionalId com o ID do profissional logado, se houver
  const [professionalId, setProfessionalId] = useState(loggedInProfessionalId || "");
  const [serviceId, setServiceId] = useState("");
  const [, setSelectedDate] = useState("");

  const [serviceDuration] = useState<number | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  /* =============================
   * NOVO: MODO DE SELEÇÃO PARA CONCLUIR AGENDAMENTOS
   * ============================= */
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set());

  const selectableAppointments = useMemo(() => {
    return appointments.filter(a => a.status === "scheduled");
  }, [appointments]);

  const allSelectableSelected = selectableAppointments.length > 0 && selectedAppointments.size === selectableAppointments.length;

  /* =============================
   * TEMA
   * ============================= */
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);

    if (tenant?.theme_variant) {
      document.documentElement.setAttribute(
        "data-theme-variant",
        tenant.theme_variant
      );
    }
  }, [theme, tenant]);

  /* =============================
   * CARREGAR AGENDAMENTOS
   * ============================= */
  useEffect(() => {
    if (!tenantId) return;
    fetchAppointments();
  }, [tenantId, currentDate, loggedInProfessionalId]); // Adiciona loggedInProfessionalId como dependência

  async function fetchAppointments() {
    setLoading(true);

    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);

    let query = supabase
      .from("appointments")
      .select(
        `
        id, starts_at, ends_at, status,
        service:services(name),
        professional:professionals(name),
        customer:customers(full_name)
      `
      )
      .eq("tenant_id", tenantId)
      .gte("starts_at", start.toISOString())
      .lte("ends_at", end.toISOString())
      .order("starts_at");

    // 🔥 NOVO: Filtra por professional_id se o usuário logado for um profissional
    if (role === "professional" && loggedInProfessionalId) {
      query = query.eq("professional_id", loggedInProfessionalId);
    }

    const { data } = await query;

    setAppointments(
      (data || []).map((a: any) => ({
        id: a.id,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        service_name: a.service?.name,
        professional_name: a.professional?.name,
        customer_name: a.customer?.full_name,
        avatar_url: a.professional?.name
          ? `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(
              a.professional.name
            )}`
          : undefined,
      }))
    );

    setLoading(false);
  }

  /* =============================
   * CALENDÁRIO / HORÁRIOS
   * ============================= */

  async function handleSelectDate(date: Date) {
    if (!professionalId) return toast.warn("Selecione o profissional primeiro");
    if (!serviceId || !serviceDuration)
      return toast.warn("Selecione o serviço primeiro");

    const d = toLocalISOString(date).split("T")[0];

    if (isHoliday(d)) return toast.warn("Feriado não permitido");

    setSelectedDate(d);
    setShowCalendar(false);

    setTimeout(async () => {
      // Adicionado async aqui
      if (tenantId && professionalId && serviceDuration) {
        const times = await getAvailableTimeSlots(
          tenantId,
          professionalId,
          serviceDuration,
          d
        );
        setAvailableTimes(times);
        setShowTimes(true);
      }
    }, 10);
  }

  /* =============================
   * CANCELAR AGENDAMENTO INDIVIDUAL
   * ============================= */
  async function handleCancelAppointment(id: string) {
    if (!confirm("Deseja cancelar este agendamento?")) return;

    const { error } = await supabase
      .from("appointments")
      .update({ status: "canceled" })
      .eq("id", id);

    if (error) return toast.error("Erro ao cancelar.");

    toast.success("Agendamento cancelado!");
    fetchAppointments();
  }

  /* =============================
   * NOVO: LÓGICA DE SELEÇÃO
   * ============================= */
  function toggleSelectionMode() {
    setIsSelectionMode((prev) => !prev);
    setSelectedAppointments(new Set()); // Limpa a seleção ao entrar/sair do modo
  }

  function toggleAppointmentSelection(id: string) {
    setSelectedAppointments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (allSelectableSelected) {
      setSelectedAppointments(new Set());
    } else {
      const newSet = new Set<string>();
      selectableAppointments.forEach(a => newSet.add(a.id));
      setSelectedAppointments(newSet);
    }
  }

  async function handleCompleteSelected() {
    if (selectedAppointments.size === 0) {
      toast.warn("Selecione ao menos um agendamento para concluir.");
      return;
    }

    if (!confirm(`Deseja realmente concluir ${selectedAppointments.size} agendamento(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "done" })
        .in("id", Array.from(selectedAppointments));

      if (error) throw error;

      toast.success(`${selectedAppointments.size} agendamento(s) concluído(s)!`);
      toggleSelectionMode(); // Sai do modo de seleção
      fetchAppointments(); // Recarrega os agendamentos
    } catch (error: any) {
      console.error("Erro ao concluir agendamentos:", error);
      toast.error("Erro ao concluir agendamentos: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  /* =============================
   * RENDER
   * ============================= */

  const formattedDate = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const canManageAppointments = role === "manager" || role === "owner";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Agenda</h2>

        {canManageAppointments && !isSelectionMode && (
          <div className={styles.agendaHeaderButtons}> {/* NEW CLASS */}
            <button className={styles.newButton} onClick={() => setShowWizard(true)}>
              <Plus size={18} /> Novo Agendamento
            </button>
            <button className={styles.completeButton} onClick={toggleSelectionMode}>
              <CheckSquare size={18} /> Concluir Agendamentos
            </button>
          </div>
        )}

        {canManageAppointments && isSelectionMode && (
          <div className={styles.selectionModeActions}>
            <button className={styles.exitSelectionButton} onClick={toggleSelectionMode}>
              Sair do Modo de Seleção
            </button>
            <button
              className={styles.confirmCompletionButton}
              onClick={handleCompleteSelected}
              disabled={selectedAppointments.size === 0 || loading}
            >
              {loading ? "Concluindo..." : `Concluir (${selectedAppointments.size})`}
            </button>
          </div>
        )}
      </div>

      <div className={styles.dateNav}>
        <button
          className={styles.navButton}
          onClick={() =>
            setCurrentDate((d) => new Date(d.getTime() - 86400_000))
          }
        >
          <ChevronLeft size={18} />
        </button>

        <div className={styles.dateCenter}>
          <DatePickerAgenda
            value={toLocalISOString(currentDate).split("T")[0]}
            onSelect={(iso) => setCurrentDate(new Date(`${iso}T00:00:00`))}
          />
          <h3 className={styles.date}>{formattedDate}</h3>
        </div>

        <button
          className={styles.navButton}
          onClick={() =>
            setCurrentDate((d) => new Date(d.getTime() + 86400_000))
          }
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {canManageAppointments && isSelectionMode && (
        <div className={styles.selectAllContainer}>
          <label className={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={allSelectableSelected}
              onChange={toggleSelectAll}
              className={styles.selectAllCheckbox}
            />
            Selecionar Todos ({selectableAppointments.length} agendamentos agendados)
          </label>
        </div>
      )}

      <div className={styles.list}>
        {loading ? (
          <p>Carregando...</p>
        ) : appointments.length === 0 ? (
          <p>Nenhum agendamento.</p>
        ) : (
          appointments.map((a) => (
            <div key={a.id} className={styles.card}>
              {canManageAppointments && isSelectionMode && a.status === "scheduled" && (
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={selectedAppointments.has(a.id)}
                    onChange={() => toggleAppointmentSelection(a.id)}
                    className={styles.appointmentCheckbox}
                  />
                </div>
              )}

              <img className={styles.avatar} src={a.avatar_url} />

              <div className={styles.details}>
                <strong>
                  {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {new Date(a.ends_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>

                <p>
                  {a.service_name} com {a.professional_name}
                </p>

                {a.status === "canceled" && (
                  <span style={{ color: "red", fontWeight: "bold" }}>
                    Cancelado
                  </span>
                )}
                {a.status === "done" && (
                  <span style={{ color: "green", fontWeight: "bold" }}>
                    Concluído
                  </span>
                )}

                <p>Cliente: {a.customer_name}</p>
              </div>

              {canManageAppointments && !isSelectionMode && a.status !== "done" && (
                <div className={styles.cardActions}>
                  {a.status === "canceled" ? (
                    <button disabled className={styles.iconButtonCancel}>
                      Cancelado
                    </button>
                  ) : (
                    <button
                      className={styles.iconButtonCancel}
                      onClick={() => handleCancelAppointment(a.id)}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* -- MODAIS -- */}

      {showNewCustomer && (
        <div className={styles.overlay}>
          <div className={styles.modalContent}>
            <NewCustomerForm
              tenantId={tenantId ?? ""}
              mode="new" // Corrigido para "new"
              onCancel={() => setShowNewCustomer(false)}
              onSaveSuccess={() => {}}
            />
          </div>
        </div>
      )}

      <ModalNewService
        tenantId={tenantId ?? ""}
        mode="agenda"
        show={showNewService}
        onClose={() => setShowNewService(false)}
        onSuccess={() => {}}
      />

      <ModalNewProfessional
        tenantId={tenantId ?? ""}
        mode="agenda"
        show={showNewProfessional}
        onClose={() => setShowNewProfessional(false)}
        onSuccess={(id) => setProfessionalId(id)}
      />

      <ModalCalendar
        show={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={handleSelectDate}
      />

      <ModalScheduleTimes
        show={showTimes}
        times={availableTimes}
        onClose={() => setShowTimes(false)}
        onSelect={() => setShowTimes(false)}
      />

      <ModalSelectProfessional
        show={showProfessionalModal}
        professionals={[]}
        onClose={() => setShowProfessionalModal(false)}
        onSelect={(id) => {
          setProfessionalId(id);
          setShowProfessionalModal(false);
          setShowCalendar(true);
        }}
      />

      <ModalScheduleWizard
        open={showWizard}
        tenantId={tenantId ?? ""}
        onClose={() => setShowWizard(false)}
        onBooked={() => fetchAppointments()}
      />
    </div>
  );
}