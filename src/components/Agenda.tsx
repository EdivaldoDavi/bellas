/** AGENDA — CLEAN VERSION (sem estados não usados) **/

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import DatePickerAgenda from "../components/DatePickerAgenda";

import ModalCalendar from "./ModalCalendar";
import ModalScheduleTimes from "./ModalScheduletimes";

import ModalSelectProfessional from "./ModalSelectProfessional";
import ModalScheduleWizard from "../components/ModalScheduleWizard";

import ModalNewCustomer from "../components/ModalNewCustomer";
import ModalNewService from "../components/ModalNewService";
import ModalNewProfessional from "../components/ModalNewProfessional";

import { useTheme } from "../hooks/useTheme";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import {
  toLocalISOString,
  isPastDateLocal,
  getWeekdayLocal,
  combineLocalDateTime,
  getDayBoundsISO,
  isHoliday,
} from "../utils/date";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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

  const tenantId = profile?.tenant_id ?? null;
  const role = profile?.role ?? null;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  /* Modais */
  const [showWizard, setShowWizard] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimes, setShowTimes] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showNewProfessional, setShowNewProfessional] = useState(false);

  /* Campos */
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [_, setSelectedDate] = useState("");

  /* Dados do profissional */
  const [professionalServices, setProfessionalServices] = useState<any[]>([]);
  const [serviceDuration, setServiceDuration] = useState<number | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  /* ============================================
   * TEMA
   * ============================================ */
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);

    if (tenant?.theme_variant) {
      document.documentElement.setAttribute(
        "data-theme-variant",
        tenant.theme_variant
      );
    }
  }, [theme, tenant]);

  /* ============================================
   * LOAD APPOINTMENTS
   * ============================================ */
  useEffect(() => {
    if (!tenantId) return;
    fetchAppointments();
  }, [tenantId, currentDate]);

  async function fetchAppointments() {
    setLoading(true);

    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);

    const { data } = await supabase
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

  /* ============================================
   * OUTRAS FUNÇÕES
   * ============================================ */

  async function fetchServicesByProfessional(id: string) {
    const { data } = await supabase
      .from("professional_services")
      .select("service:services(id,name,duration_min)")
      .eq("tenant_id", tenantId)
      .eq("professional_id", id);

    setProfessionalServices((data || []).map((r: any) => r.service));
  }

  async function loadAvailableTimes(date: string, profId: string) {
    if (!tenantId || !profId || !serviceDuration) return;

    if (isPastDateLocal(date) || isHoliday(date)) return setAvailableTimes([]);

    const weekday = getWeekdayLocal(date);

    const { data: schedule } = await supabase
      .from("professional_schedules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("professional_id", profId)
      .eq("weekday", weekday)
      .maybeSingle();

    if (!schedule) return setAvailableTimes([]);

    const workStart = combineLocalDateTime(date, schedule.start_time.slice(0, 5));
    const workEnd = combineLocalDateTime(date, schedule.end_time.slice(0, 5));

    const hasBreak =
      schedule.break_start_time !== "00:00:00" &&
      schedule.break_end_time !== "00:00:00";

    const breakStart = hasBreak
      ? combineLocalDateTime(date, schedule.break_start_time.slice(0, 5))
      : null;

    const breakEnd = hasBreak
      ? combineLocalDateTime(date, schedule.break_end_time.slice(0, 5))
      : null;

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
    const isToday = toLocalISOString(now).split("T")[0] === date;

    while (t < workEnd) {
      const endSlot = new Date(t.getTime() + serviceDuration * 60000);
      if (endSlot > workEnd) break;

      const overlapBreak =
        hasBreak && breakStart && breakEnd && t < breakEnd && endSlot > breakStart;

      if (overlapBreak) {
        t = new Date(breakEnd);
        continue;
      }

      if (isToday && endSlot <= now) {
        t = new Date(t.getTime() + serviceDuration * 60000);
        continue;
      }

      const conflict = (booked || []).some((b) => {
        const s = new Date(b.starts_at);
        const e = new Date(b.ends_at);
        return t < e && endSlot > s;
      });

      if (!conflict) {
        slots.push(`${String(t.getHours()).padStart(2, "0")}:${String(
          t.getMinutes()
        ).padStart(2, "0")}`);
      }

      t = new Date(t.getTime() + serviceDuration * 60000);
    }

    setAvailableTimes(slots);
  }

  async function handleSelectDate(date: Date) {
    if (!professionalId) return toast.warn("Selecione o profissional primeiro");
    if (!serviceId || !serviceDuration)
      return toast.warn("Selecione o serviço primeiro");

    const d = toLocalISOString(date).split("T")[0];

    if (isHoliday(d)) return toast.warn("Feriado não permitido");

    setSelectedDate(d);
    setShowCalendar(false);

    setTimeout(() => {
      loadAvailableTimes(d, professionalId);
      setShowTimes(true);
    }, 10);
  }

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

  /* ============================================
   * RENDER
   * ============================================ */

  const formattedDate = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Agenda</h2>

        {(role === "manager" || role === "owner") && (
          <button className={styles.newButton} onClick={() => setShowWizard(true)}>
            <Plus size={18} /> Novo Agendamento
          </button>
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

                <p>Cliente: {a.customer_name}</p>
              </div>

              {(role === "manager" || role === "owner") && (
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

      {/* -- MODAIS AUXILIARES -- */}

      <ModalNewCustomer
        tenantId={tenantId ?? ""}
        mode="agenda"
        show={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onSuccess={() => {}}
      />

      <ModalNewService
        tenantId={tenantId ?? ""}
        mode="agenda"
        show={showNewService}
        onClose={() => setShowNewService(false)}
        onSuccess={(id) => setServiceId(id)}
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
        onSelect={async (id) => {
          setProfessionalId(id);
          setServiceId("");
          setServiceDuration(null);
          setSelectedDate("");
          setAvailableTimes([]);

          await fetchServicesByProfessional(id);

          setShowProfessionalModal(false);
          setShowServiceModal(true);
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
