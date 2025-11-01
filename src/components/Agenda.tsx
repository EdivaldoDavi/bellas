import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
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

// ✅ Modais
import ModalNewCustomer from "../components/ModalNewCustomer";
import ModalNewService from "../components/ModalNewService";
import ModalNewProfessional from "../components/ModalNewProfessional";

// ✅ Tipagens
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

interface Service {
  id: string;
  name: string;
  duration_min?: number;
}

interface Professional {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  full_name: string;
}

// ✅ Helpers locais (sem UTC)
function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dateToInputValue(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isPastDateLocal(dateStr: string) {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sel = parseLocalDate(dateStr);
  return sel.getTime() < t.getTime();
}

function getWeekdayLocal(dateStr: string) {
  const wd = parseLocalDate(dateStr).getDay();
  return wd === 0 ? 7 : wd; // Domingo = 7
}

function combineLocalDateTime(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh, mm);
}

function getDayBoundsISO(dateStr: string) {
  const base = parseLocalDate(dateStr);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

const fixedHolidays = ["01-01","04-21","05-01","09-07","10-12","11-02","11-15","12-25"];
function isHoliday(dateStr: string) {
  return fixedHolidays.includes(dateStr.slice(5));
}

// ==========================================================
// ✅ Componente
// ==========================================================
export default function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Modal principal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos do form
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [professionalServices, setProfessionalServices] = useState<Service[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);

  // Modais secundários
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showNewProfessional, setShowNewProfessional] = useState(false);

  // ================================
  // Perfil
  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      if (profile) {
        setTenantId(profile.tenant_id);
        setRole(profile.role);
      }
    })();
  }, []);

  // ================================
  // Agendamentos
  async function fetchAppointments() {
    if (!tenantId) return;
    setLoading(true);

    const d = dateToInputValue(currentDate);
    const { startISO, endISO } = getDayBoundsISO(d);

    const { data } = await supabase
      .from("appointments")
      .select(`
        id, starts_at, ends_at, status,
        service:services(id,name),
        professional:professionals(id,name),
        customer:customers(id,full_name)
      `)
      .eq("tenant_id", tenantId)
      .gte("starts_at", startISO)
      .lte("ends_at", endISO)
      .order("starts_at");

    setAppointments((data || []).map((a: any) => ({
      id: a.id,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      status: a.status,
      service_name: a.service?.name,
      service_id: a.service?.id,
      professional_name: a.professional?.name,
      professional_id: a.professional?.id,
      customer_name: a.customer?.full_name,
      customer_id: a.customer?.id,
      avatar_url: `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(
        a.professional?.name || "Profissional"
      )}`,
    })));

    setLoading(false);
  }

  useEffect(() => { if (tenantId) fetchAppointments(); }, [tenantId, currentDate]);

  // ================================
  async function loadFormData() {
    if (!tenantId) return;

    const [prof, cust] = await Promise.all([
      supabase.from("professionals").select("id,name").eq("tenant_id", tenantId),
      supabase.from("customers").select("id,full_name").eq("tenant_id", tenantId),
    ]);

    setProfessionals(prof.data || []);
    setCustomers(cust.data || []);
  }

  async function fetchServicesByProfessional(profId: string) {
    const { data } = await supabase
      .from("professional_services")
      .select("service:services(id,name,duration_min)")
      .eq("tenant_id", tenantId)
      .eq("professional_id", profId);

    setProfessionalServices((data || []).map((s: any) => s.service));
  }

  // ================================
  // ⏱ Horários disponíveis
  async function loadAvailableTimes(date: string, profId: string, duration = serviceDuration) {
    if (!tenantId || !date || !profId || !duration) return;
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

    const workStart = combineLocalDateTime(date, schedule.start_time.slice(0,5));
    const workEnd   = combineLocalDateTime(date, schedule.end_time.slice(0,5));

    const hasBreak = schedule.break_start_time !== "00:00:00" && schedule.break_end_time !== "00:00:00";
    const breakStart = hasBreak ? combineLocalDateTime(date, schedule.break_start_time.slice(0,5)) : null;
    const breakEnd   = hasBreak ? combineLocalDateTime(date, schedule.break_end_time.slice(0,5)) : null;

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

// ▶️ se é hoje, não permitir horários já passados
const today = new Date();
const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const selectedMid = new Date(workStart.getFullYear(), workStart.getMonth(), workStart.getDate());
const isToday = todayMid.getTime() === selectedMid.getTime();

while (t < workEnd) {
  const end = new Date(t.getTime() + duration * 60000);
  if (end > workEnd) break;

  // ✅ Permitir se terminar exatamente no início do intervalo
  const endsExactlyAtBreak =
    hasBreak &&
    breakStart &&
    end.getTime() === breakStart.getTime();

  // ❌ Bloquear se ultrapassar intervalo
  const invadeBreak =
    hasBreak &&
    breakStart &&
    breakEnd &&
    t < breakEnd &&
    end > breakStart &&
    !endsExactlyAtBreak;

  if (invadeBreak) {
    t = new Date(breakEnd!);
    continue;
  }

  // ❌ Bloquear horários já passados quando for o mesmo dia
  if (isToday) {
    const now = new Date();
    if (end <= now) {
      t = new Date(t.getTime() + duration * 60000);
      continue;
    }
  }

  const conflict = (booked || []).some(b => {
    const s = new Date(b.starts_at);
    const e = new Date(b.ends_at);
    return t < e && end > s;
  });

  if (!conflict) {
    slots.push(
      String(t.getHours()).padStart(2, "0") + ":" +
      String(t.getMinutes()).padStart(2, "0")
    );
  }

  t = new Date(t.getTime() + duration * 60000);
}

    setAvailableTimes(slots);
  }

  // ================================
  function resetForm() {
    setEditingId(null);
    setServiceId("");
    setProfessionalId("");
    setCustomerId("");
    setSelectedDate("");
    setStartTime("");
    setEndTime("");
    setServiceDuration(null);
    setAvailableTimes([]);
    setProfessionalServices([]);
  }

  // ================================
  const openModal = async (a?: Appointment) => {
    await loadFormData();
    resetForm();

    if (a) {
      setEditingId(a.id);
      setProfessionalId(a.professional_id || "");
      setCustomerId(a.customer_id || "");
      setServiceId(a.service_id || "");

      const dt = new Date(a.starts_at);
      setSelectedDate(dateToInputValue(dt));
      setStartTime(dt.toTimeString().slice(0, 5));
      setEndTime(new Date(a.ends_at).toTimeString().slice(0, 5));

      await fetchServicesByProfessional(a.professional_id || "");
      loadAvailableTimes(dateToInputValue(dt), a.professional_id || "");
    }

    setShowModal(true);
  };

  // ================================
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
      status: "scheduled",
    };

    const { error } = editingId
      ? await supabase.from("appointments").update(payload).eq("id", editingId)
      : await supabase.from("appointments").insert([payload]);

    if (error) return toast.error("Erro ao salvar");

    toast.success(editingId ? "Atualizado!" : "Agendado!");
    setShowModal(false);
    fetchAppointments();
  }

  async function handleDeleteAppointment(id: string) {
    if (!confirm("Excluir?")) return;
    await supabase.from("appointments").delete().eq("id", id);
    fetchAppointments();
  }

  // ================================
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(currentDate);

  const handlePrevDay = () => setCurrentDate((d) => new Date(d.getTime() - 86400000));
  const handleNextDay = () => setCurrentDate((d) => new Date(d.getTime() + 86400000));

  // ==========================================================
  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2 className={styles.title}>Agenda</h2>
        {role === "manager" && (
          <button onClick={() => openModal()} className={styles.newButton}>
            <Plus size={18} /> Novo Agendamento
          </button>
        )}
      </div>

      {/* Navegação */}
      {/* Navegação de data */}
<div className={styles.dateNav}>
  <button onClick={handlePrevDay} className={styles.navButton}>
    <ChevronLeft size={18} />
  </button>

  <div className={styles.dateCenter}>
    <div className={styles.datePickerWrapper}>
    
      <input
        type="date"
        className={styles.datePicker}
        value={currentDate.toISOString().split("T")[0]}
        onChange={(e) => {
          const selectedDate = e.target.value
            ? new Date(`${e.target.value}T00:00:00`) // ✅ fixa o horário local
            : new Date();
          setCurrentDate(selectedDate);
        }}
      />
    </div>
    <h3 className={styles.date}>{formattedDate}</h3>
  </div>

  <button onClick={handleNextDay} className={styles.navButton}>
    <ChevronRight size={18} />
  </button>
</div>
      {/* Lista */}
      <div className={styles.list}>
        {loading ? <p>Carregando...</p> :
        appointments.length === 0 ? <p>Nenhum agendamento.</p> :
        appointments.map((a) => (
          <div key={a.id} className={styles.card}>
            <img className={styles.avatar} src={a.avatar_url} />
            <div className={styles.details}>
              <strong>
                {new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} -{" "}
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
                <button onClick={() => handleDeleteAppointment(a.id)} className={styles.iconButtonDelete}>
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <button onClick={() => setShowModal(false)} className={styles.closeBtn}><X /></button>
            <h3>📅 {editingId ? "Editar Agendamento" : "Novo Agendamento"}</h3>

            {/* PROFISSIONAL */}
            <label>Profissional</label>
            <div className={styles.rowWithButton}>
              <select
                className={styles.input}
                value={professionalId}
                onClick={() => {}}
                onChange={async (e) => {
                  const id = e.target.value;
                  setProfessionalId(id);
                  await fetchServicesByProfessional(id);
                  setServiceId("");
                  setSelectedDate("");
                  setAvailableTimes([]);
                }}
              >
                <option value="">Selecione</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button onClick={() => setShowNewProfessional(true)} className={styles.smallBtn}><Plus size={16}/></button>
            </div>

            {/* SERVIÇO */}
            <label>Serviço</label>
            <div className={styles.rowWithButton}>
              <select
                className={styles.input}
                value={serviceId}
                onClick={() => { if (!professionalId) toast.warn("Selecione primeiro o profissional"); }}
                onChange={(e) => {
                  if (!professionalId) return toast.warn("Selecione primeiro o profissional");
                  const id = e.target.value;
                  setServiceId(id);
                  const svc = professionalServices.find((s) => s.id === id);
                  setServiceDuration(svc?.duration_min || 60);
                  if (selectedDate)
                    loadAvailableTimes(selectedDate, professionalId, svc?.duration_min);
                }}
              >
                <option value="">Selecione</option>
                {professionalServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <button onClick={() => setShowNewService(true)} className={styles.smallBtn}><Plus size={16}/></button>
            </div>

            {/* Tempo estimado */}
            {serviceDuration && (
              <div className={styles.serviceTimeInfo}>
                <span className={styles.timeIcon}>⏱</span>
                <span className={styles.timeLabel}>Tempo estimado: {serviceDuration} min</span>
              </div>
            )}

            {/* CLIENTE */}
            <label>Cliente</label>
            <div className={styles.rowWithButton}>
              <select
                className={styles.input}
                value={customerId}
                onClick={() => {}}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Selecione</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              <button onClick={() => setShowNewCustomer(true)} className={styles.smallBtn}><Plus size={16}/></button>
            </div>

            {/* DATA */}
            <label>Data</label>
            <input
              type="date"
              className={styles.input}
              value={selectedDate}
              onClick={() => {
                if (!professionalId) return toast.warn("Selecione primeiro o profissional");
                if (!serviceId) return toast.warn("Selecione primeiro o serviço");
              }}
              onChange={(e) => {
                if (!professionalId) return toast.warn("Selecione primeiro o profissional");
                if (!serviceId) return toast.warn("Selecione primeiro o serviço");

                const d = e.target.value;
                if (!d) return;
                if (isPastDateLocal(d)) return toast.warn("Data passada não permitida");
                if (isHoliday(d)) return toast.warn("Feriado não permitido");

                setSelectedDate(d);
                if (serviceDuration)
                  loadAvailableTimes(d, professionalId, serviceDuration);
              }}
            />

            {/* HORÁRIO */}
            <label>Horário</label>
            <select
              className={styles.input}
              value={startTime}
              onClick={() => { if (!selectedDate) toast.warn("Selecione a data primeiro"); }}
              onChange={(e) => {
                if (!selectedDate) return toast.warn("Selecione a data primeiro");
                const t = e.target.value;
                setStartTime(t);
                const end = combineLocalDateTime(selectedDate, t);
                end.setMinutes(end.getMinutes() + (serviceDuration || 60));
                setEndTime(
                  end.toTimeString().slice(0,5)
                );
              }}
            >
              <option value="">Selecione</option>
              {availableTimes.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <button className={styles.saveButton} onClick={handleSaveAppointment}>
              {editingId ? "Salvar" : "Agendar"}
            </button>
          </div>
        </div>
      )}

      {/* MODAIS AUXILIARES */}
      {showNewCustomer && (
        <ModalNewCustomer
          tenantId={tenantId!}
          onClose={() => setShowNewCustomer(false)}
          onCreated={(id) => {
            setCustomerId(id);
            loadFormData();
          }}
        />
      )}

      {showNewService && (
        <ModalNewService
          tenantId={tenantId!}
          onClose={() => setShowNewService(false)}
          onCreated={(id) => {
            setServiceId(id);
            loadFormData();
          }}
        />
      )}

      {showNewProfessional && (
        <ModalNewProfessional
          tenantId={tenantId!}
          onClose={() => setShowNewProfessional(false)}
          onCreated={async (id) => {
            setProfessionalId(id);
            await fetchServicesByProfessional(id);
            loadFormData();
          }}
        />
      )}
    </div>
  );
}
