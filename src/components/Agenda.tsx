import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import ModalCalendar from "./ModalCalendar";
import ModalScheduleTimes from "./ModalScheduletimes";
import ModalSelectServiceForProfessional from "./ModalSelectServiceForProfessional";
import ModalSelectProfessional from "./ModalSelectProfessional";
import ModalScheduleWizard from "../components/ModalScheduleWizard";
// Tema / Branding
import { useTheme } from "../hooks/useTheme";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import {
  toLocalISOString,
  isPastDateLocal,
  getWeekdayLocal,
  combineLocalDateTime,
  getDayBoundsISO,
  weekdayName,
  dateBR,
  isHoliday
} from "../utils/date";

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Edit2,
  Trash2,
} from "lucide-react";

import styles from "../css/Agenda.module.css";
import { getCurrentProfile, supabase } from "../lib/supabaseCleint";

// ✅ Components
import SelectClientWhatsApp from "../components/SelectClientWhatsapp";

// ✅ Bootstrap Modals
import ModalNewCustomer from "../components/ModalNewCustomer";
import ModalNewService from "../components/ModalNewService";
import ModalNewProfessional from "../components/ModalNewProfessional";

// =============================
// Tipagens
// =============================
interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service_id?: string;
  professional_id?: string;
  customer_id?: string;
  service_name?: string;
  professional_name?: string;
  customer_name?: string;
  avatar_url?: string;
}

export default function Agenda() {
  const [showWizard, setShowWizard] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Profissional
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [selectedProfessionalName, setSelectedProfessionalName] = useState("");
  const [professionals, setProfessionals] = useState<any[]>([]);

  // Calendário / Horários
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimes, setShowTimes] = useState(false);

  // Modal CRUD
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Serviço
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState("");

  // Form fields
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [professionalServices, setProfessionalServices] = useState<any[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);

  // Aux Modals
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showNewProfessional, setShowNewProfessional] = useState(false);

  // Tema
  const { theme } = useTheme();
  const { profile } = useUserAndTenant();

  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    if (profile?.theme_variant)
      document.documentElement.setAttribute("data-theme-variant", profile.theme_variant);
  }, [theme, profile]);

  useEffect(() => {
    (async () => {
      const p = await getCurrentProfile();
      if (p) {
        setTenantId(p.tenant_id);
        setRole(p.role);
      }
    })();
  }, []);

  async function loadProfessionals() {
    const { data } = await supabase
      .from("professionals")
      .select("id,name");

    setProfessionals(data || []);
  }

  useEffect(() => {
    if (!tenantId) return;
    fetchAppointments();
  }, [tenantId, currentDate]);

  async function fetchAppointments() {
    setLoading(true);

    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(currentDate);
    end.setHours(23, 59, 59);

    const { data } = await supabase
      .from("appointments")
      .select(`
        id, starts_at, ends_at, status,
        service:services(id,name),
        professional:professionals(id,name),
        customer:customers(id,full_name)
      `)
      .eq("tenant_id", tenantId)
      .gte("starts_at", start.toISOString())
      .lte("ends_at", end.toISOString())
      .order("starts_at");

   setAppointments(
  (data || []).map((a: any) => ({
    id: a.id,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    status: a.status, // ✅ FALTAVA ISSO
    service_name: a.service?.name,
    service_id: a.service?.id,
    professional_name: a.professional?.name,
    professional_id: a.professional?.id,
    customer_name: a.customer?.full_name,
    customer_id: a.customer?.id,
    avatar_url: `https://api.dicebear.com/8.x/avataaars/svg?seed=${a.professional?.name}`
  }))
);

    setLoading(false);
  }

  async function fetchServicesByProfessional(id: string) {
    const { data } = await supabase
      .from("professional_services")
      .select("service:services(id,name,duration_min)")
      .eq("tenant_id", tenantId)
      .eq("professional_id", id);

    setProfessionalServices((data || []).map((r: any) => r.service));
  }

  async function loadAvailableTimes(date: string, profId: string, duration = serviceDuration) {
    if (!tenantId || !date || !profId || !duration) return setAvailableTimes([]);
    if (isPastDateLocal(date) || isHoliday(date)) return setAvailableTimes([]);

    const weekday = getWeekdayLocal(date);

    const { data: schedule } = await supabase
      .from("professional_schedules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("professional_id", profId)
      .eq("weekday", weekday)
      .single();

    if (!schedule) return setAvailableTimes([]);

    const workStart = combineLocalDateTime(date, schedule.start_time.slice(0, 5));
    const workEnd = combineLocalDateTime(date, schedule.end_time.slice(0, 5));

    const hasBreak = schedule.break_start_time !== "00:00:00" && schedule.break_end_time !== "00:00:00";
    const breakStart = hasBreak ? combineLocalDateTime(date, schedule.break_start_time.slice(0, 5)) : null;
    const breakEnd = hasBreak ? combineLocalDateTime(date, schedule.break_end_time.slice(0, 5)) : null;

    const { startISO, endISO } = getDayBoundsISO(date);

    const { data: booked } = await supabase
      .from("appointments")
      .select("starts_at, ends_at")
      .eq("tenant_id", tenantId)
      .eq("professional_id", profId)
      .gte("starts_at", startISO)
      .lte("ends_at", endISO);

    const slots: string[] = [];
    let t = new Date(workStart);
    const now = new Date();
    const isToday =
      now.getFullYear() === workStart.getFullYear() &&
      now.getMonth() === workStart.getMonth() &&
      now.getDate() === workStart.getDate();

    while (t < workEnd) {
      const end = new Date(t.getTime() + duration * 60000);
      if (end > workEnd) break;

      const overlapBreak =
        hasBreak && breakStart && breakEnd && t < breakEnd && end > breakStart;

      if (overlapBreak) {
        t = new Date(breakEnd!);
        continue;
      }

      if (isToday && end <= now) {
        t = new Date(t.getTime() + duration * 60000);
        continue;
      }

      const conflict = (booked || []).some((b) => {
        const s = new Date(b.starts_at);
        const e = new Date(b.ends_at);
        return t < e && end > s;
      });

      if (!conflict) {
        slots.push(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
      }

      t = new Date(t.getTime() + duration * 60000);
    }

    setAvailableTimes(slots);
  }

  function resetForm() {
    setEditingId(null);
    setProfessionalId("");
    setSelectedProfessionalName("");
    setServiceId("");
    setSelectedServiceName("");
    setCustomerId("");
    setSelectedDate("");
    setStartTime("");
    setEndTime("");
    setAvailableTimes([]);
    setServiceDuration(null);
  }

  const openModal = async (a?: Appointment) => {
    resetForm();

    if (a) {
      setEditingId(a.id);
      setProfessionalId(a.professional_id || "");
      setSelectedProfessionalName(a.professional_name || "");
      setServiceId(a.service_id || "");
      setSelectedServiceName(a.service_name || "");
      setCustomerId(a.customer_id || "");

      const d = toLocalISOString(new Date(a.starts_at)).split("T")[0];
      const t = new Date(a.starts_at).toTimeString().slice(0, 5);

      setSelectedDate(d);
      setStartTime(t);

      await fetchServicesByProfessional(a.professional_id!);
    }

    setShowModal(true);
  };

  async function handleSaveAppointment() {
    if (!tenantId || !serviceId || !professionalId || !customerId || !selectedDate || !startTime)
      return toast.warn("Preencha todos os campos!");

    const { data: cli } = await supabase
      .from("customers")
      .select("full_name,customer_phone")
      .eq("id", customerId)
      .single();

    const start = combineLocalDateTime(selectedDate, startTime);
    const end = new Date(start.getTime() + (serviceDuration || 60) * 60000);

    const payload = {
      tenant_id: tenantId,
      professional_id: professionalId,
      service_id: serviceId,
      customer_id: customerId,
      customer_name: cli?.full_name,
      customer_phone: cli?.customer_phone,
      starts_at: start,
      ends_at: end,
      status: "scheduled"
    };

    const { error } = editingId
      ? await supabase.from("appointments").update(payload).eq("id", editingId)
      : await supabase.from("appointments").insert([payload]);

    if (error) return toast.error("Erro ao salvar");

    toast.success(editingId ? "Atualizado!" : "Agendado!");
    setShowModal(false);
    fetchAppointments();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir?")) return;
    await supabase.from("appointments").delete().eq("id", id);
    fetchAppointments();
  }

  async function handleSelectDate(date: Date) {
    if (!professionalId) return toast.warn("Selecione o profissional primeiro");
    if (!serviceId || !serviceDuration) return toast.warn("Selecione o serviço primeiro");

    const d = toLocalISOString(date).split("T")[0];

    const today = new Date();
    const selected = new Date(`${d}T00:00:00`);
    if (selected < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      return toast.warn("Data passada não permitida");
    }

    if (isHoliday(d)) return toast.warn("Feriado não permitido");

    setSelectedDate(d);
    setShowCalendar(false);

    setTimeout(() => {
      loadAvailableTimes(d, professionalId, serviceDuration!);
      setShowTimes(true);
    }, 10);
  }

  const formattedDate = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  const unifiedDateTimeText = selectedDate
    ? `${dateBR(selectedDate)} (${weekdayName(selectedDate)})` +
      (startTime && endTime ? ` — ${startTime} até ${endTime}` : "")
    : "";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Agenda</h2>
       {role === "manager" && (
  <button className={styles.newButton} onClick={() => setShowWizard(true)}>
    <Plus size={18} /> Novo Agendamento
  </button>
)}

      </div>

      {/* Navegação de data */}
      <div className={styles.dateNav}>
        <button onClick={() => setCurrentDate(d => new Date(d.getTime() - 86400000))} className={styles.navButton}>
          <ChevronLeft size={18} />
        </button>

        <div className={styles.dateCenter}>
          <div className={styles.datePickerWrapper}>
            <input
              type="date"
              className={styles.datePicker}
              value={toLocalISOString(currentDate).split("T")[0]}
              onChange={(e) => {
                const sel = e.target.value
                  ? new Date(`${e.target.value}T00:00:00`)
                  : new Date();
                setCurrentDate(sel);
              }}
            />
          </div>
          <h3 className={styles.date}>{formattedDate}</h3>
        </div>

        <button onClick={() => setCurrentDate(d => new Date(d.getTime() + 86400000))} className={styles.navButton}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Lista de agendamentos */}
      <div className={styles.list}>
        {loading ? (
          <p>Carregando...</p>
        ) : appointments.length === 0 ? (
          <p>Nenhum agendamento.</p>
        ) : (
          appointments.map((a) => (
            <div key={a.id} className={styles.card}>
              <img className={styles.avatar} src={a.avatar_url} />
              <div className={styles.details}>
                <strong>
                  {new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {" - "}
                  {new Date(a.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </strong>
                <p>{a.service_name} com {a.professional_name}</p>
                <p>Cliente: {a.customer_name}</p>
              </div>

              {role === "manager" && (
                <div className={styles.cardActions}>
                  <button onClick={() => openModal(a)} className={styles.iconButton}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className={styles.iconButtonDelete}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de Agendamento */}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
              <X />
            </button>

            <h3>📅 {editingId ? "Editar" : "Novo"} Agendamento</h3>

            {/* Profissional */}
            <button
              type="button"
              className={styles.dateTimeContainer}
              onClick={() => {
                loadProfessionals();
                setShowProfessionalModal(true);
              }}
            >
              <div className={styles.dateTimeBox}>
                <span className={styles.dateTimeIcon}>👤</span>
                {selectedProfessionalName ? (
                  <span className={styles.dateTimeText}>{selectedProfessionalName}</span>
                ) : (
                  <span className={styles.dateTimePlaceholder}>Selecionar profissional</span>
                )}
              </div>
            </button>

            {selectedProfessionalName && (
              <div className={styles.serviceTimeInfo}>
                <span>👤 {selectedProfessionalName}</span><br />
                {selectedServiceName && (
                  <>
                    <strong>💇 {selectedServiceName}</strong><br />
                    <span>⏱ Tempo estimado: {serviceDuration} min</span>
                  </>
                )}
                <button
                  className={styles.changeServiceBtn}
                  onClick={() => setShowServiceModal(true)}
                >
                  Trocar serviço
                </button>
              </div>
            )}

            {/* Cliente */}
            <SelectClientWhatsApp
              tenantId={tenantId!}
              value={customerId}
              onChange={setCustomerId}
              onAdd={() => setShowNewCustomer(true)}
            />

            {/* Data & Hora */}
            <label className="mt-2">Data & Horário</label>
            <button
              type="button"
              className={styles.dateTimeContainer}
              onClick={() => {
                if (!professionalId) return toast.warn("Selecione o profissional primeiro");
                if (!serviceId) return toast.warn("Selecione o serviço primeiro");
                if (!serviceDuration) return toast.warn("Selecione o serviço primeiro");
                setShowCalendar(true);
              }}
            >
              <div className={styles.dateTimeBox}>
                <span className={styles.dateTimeIcon}>🕒</span>
                {selectedDate ? (
                  <span className={styles.dateTimeText}>{unifiedDateTimeText}</span>
                ) : (
                  <span className={styles.dateTimePlaceholder}>Selecionar data e horário</span>
                )}
              </div>
            </button>

            <button className={styles.saveButton} onClick={handleSaveAppointment}>
              {editingId ? "Salvar" : "Agendar"}
            </button>
          </div>
        </div>
      )}

      {/* Modais adicionais */}
      {showNewCustomer && (
        <ModalNewCustomer tenantId={tenantId!} onClose={() => setShowNewCustomer(false)} onCreated={(id) => setCustomerId(id)} />
      )}
      {showNewService && (
        <ModalNewService tenantId={tenantId!} onClose={() => setShowNewService(false)} onCreated={(id) => setServiceId(id)} />
      )}
      {showNewProfessional && (
        <ModalNewProfessional tenantId={tenantId!} onClose={() => setShowNewProfessional(false)} onCreated={(id) => setProfessionalId(id)} />
      )}

      {/* Calendário */}
      <ModalCalendar show={showCalendar} onClose={() => setShowCalendar(false)} onSelect={handleSelectDate} />

      {/* Horários */}
      <ModalScheduleTimes
        show={showTimes}
        times={availableTimes}
        onClose={() => setShowTimes(false)}
        onSelect={(t: string) => {
          setStartTime(t);
          if (!serviceDuration) return;
          const start = new Date(`${selectedDate}T${t}`);
          const end = new Date(start.getTime() + serviceDuration * 60000);
          setEndTime(end.toTimeString().slice(0, 5));
          setShowTimes(false);
        }}
      />

      {/* Modal de serviços */}
      <ModalSelectServiceForProfessional
        show={showServiceModal}
        services={professionalServices}
        onClose={() => setShowServiceModal(false)}
        onSelect={(id, name, duration) => {
          setServiceId(id);
          setSelectedServiceName(name);
          setServiceDuration(duration);
          setSelectedDate("");
          setStartTime("");
          setEndTime("");
          setAvailableTimes([]);
          setShowServiceModal(false);
        }}
      />

      {/* Modal de seleção de profissional */}
      <ModalSelectProfessional
        show={showProfessionalModal}
        professionals={professionals}
        onClose={() => setShowProfessionalModal(false)}
        onSelect={async (id, name) => {
          setProfessionalId(id);
          setSelectedProfessionalName(name);
          setServiceId("");
          setSelectedServiceName("");
          setServiceDuration(null);
          setSelectedDate("");
          setStartTime("");
          setEndTime("");
          setAvailableTimes([]);
          await fetchServicesByProfessional(id);
          setShowProfessionalModal(false);
          setShowServiceModal(true);
        }}
      />
      <ModalScheduleWizard
  open={showWizard}
  tenantId={tenantId!}
  onClose={() => setShowWizard(false)}
  onBooked={() => {
    // recarrega a agenda do dia
    fetchAppointments();
  }}
/>

    </div>
  );
}
