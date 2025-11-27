import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "react-toastify";
import styles from "../css/AgendaWizard.module.css";
import { supabase } from "../lib/supabaseCleint";

import DatePickerModal from "../components/DatePickerModal";
import SelectClientWhatsApp from "../components/SelectClientWhatsapp";
import ModalNewCustomer from "../components/ModalNewCustomer";
import ModalNewService from "../components/ModalNewService";
import ModalNewProfessional from "../components/ModalNewProfessional";

import { CalendarDays, Clock } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

import {
  combineLocalDateTime,
  weekdayName,
  dateBR
} from "../utils/date";

import { getAvailableTimeSlots } from "../utils/schedule";

type Professional = { id: string; name: string };
type Service = { id: string; name: string; duration_min?: number | null };

interface ModalScheduleWizardProps {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onBooked?: () => void;
}

export default function ModalScheduleWizard({
  open,
  tenantId,
  onClose,
  onBooked
}: ModalScheduleWizardProps) {

  const { theme } = useTheme();

  /* -------------------------------- STATES -------------------------------- */
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showNewProfessional, setShowNewProfessional] = useState(false);

  const clientRef = useRef<any>(null);

  const [searchProfessional, setSearchProfessional] = useState("");
  const [searchService, setSearchService] = useState("");

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [professionalName, setProfessionalName] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");

  // Nunca pode ser null
  const [serviceDuration, setServiceDuration] = useState<number>(60);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  /* -------------------------------- RESET -------------------------------- */
  function resetAll() {
    setStep(1);
    setProfessionalId("");
    setProfessionalName("");
    setServiceId("");
    setServiceName("");
    setServiceDuration(60); // sempre seguro

    setCustomerId("");
    setCustomerName("");
    setSelectedDate("");
    setSelectedTime("");
    setAvailableTimes([]);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  /* ----------------------------- LOAD INICIAL ----------------------------- */
  useEffect(() => {
    if (!open) return;
    resetAll();
    loadProfessionals();
  }, [open]);

  /* ------------------------------ LOAD DATA ------------------------------- */
  async function loadProfessionals() {
    const { data } = await supabase
      .from("professionals")
      .select("id,name")
      .order("name");

    setProfessionals(data || []);
  }

  async function loadServices(profId: string) {
    if (!profId) return;

    const { data } = await supabase
      .from("professional_services")
      .select("service:services(id,name,duration_min)")
      .eq("professional_id", profId);

    setServices((data || []).map((r: any) => r.service));
  }

  async function loadTimes(date: string, profId: string, duration: number) {
    setAvailableTimes([]);

    if (!tenantId || !date || !profId || !duration) return;

    const times = await getAvailableTimeSlots(
      tenantId,
      profId,
      duration,
      date
    );

    setAvailableTimes(times);
  }

  /* ----------------------------- NAVEGAÇÃO ----------------------------- */
  const canNext = useMemo(() => {
    switch (step) {
      case 1: return !!professionalId;
      case 2: return !!serviceId && !!serviceDuration;
      case 3: return !!customerId;
      case 4: return !!selectedDate;
      case 5: return !!selectedTime;
      default: return true;
    }
  }, [
    step,
    professionalId,
    serviceId,
    serviceDuration,
    customerId,
    selectedDate,
    selectedTime
  ]);

  function goNext() {
    if (!canNext) return toast.warn("Complete esta etapa.");
    if (step === totalSteps) return saveAppointment();
    setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  /* --------------------------- SALVAR AGENDAMENTO ------------------------- */
  async function saveAppointment() {
    const { data: cli } = await supabase
      .from("customers")
      .select("full_name,customer_phone")
      .eq("id", customerId)
      .single();

    const start = combineLocalDateTime(selectedDate, selectedTime);
    const end = new Date(start.getTime() + serviceDuration * 60000);

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

    const { error } = await supabase.from("appointments").insert([payload]);

    if (error) {
      toast.error("Erro ao agendar.");
      return;
    }

    toast.success("Agendado com sucesso!");
    onBooked?.();
    handleClose();
  }

  /* ------------------------------ RENDER JSX ------------------------------ */
  if (!open) return null;

  const filteredProfessionals = professionals.filter((p) =>
    p.name.toLowerCase().includes(searchProfessional.toLowerCase())
  );

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchService.toLowerCase())
  );

  const labels = [
    "Profissional",
    "Serviço",
    "Cliente",
    "Data",
    "Horário",
    "Revisão"
  ];
  const stepName = labels[step - 1];

  const stepPct =
    totalSteps > 1 ? ((step - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div
      className={`${styles.overlay} ${
        theme === "dark" ? styles.dark : ""
      }`}
    >
      <div
        className={`${styles.modal} ${
          theme === "dark" ? styles.modalDark : ""
        }`}
      >
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerBar}>
            <div className={styles.headerSide} />

            <div className={styles.headerCenter}>
              <span className={styles.headerKicker}>Agendamento</span>
              <h4 className={styles.headerTitle}>
                {stepName}{" "}
                <span className={styles.headerCount}>
                  ({step}/{totalSteps})
                </span>
              </h4>
            </div>

            <button className={styles.closeTextBtn} onClick={handleClose}>
              Fechar
            </button>
          </div>

          <div className={styles.headerProgress}>
            <div
              className={styles.headerProgressFill}
              style={{ width: `${stepPct}%` }}
            />
          </div>

          <div className={styles.headerDots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${
                  i < step ? styles.dotActive : ""
                }`}
              />
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className={styles.body}>
          {/* STEP 1 */}
          {step === 1 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Selecione o profissional</h3>

              <button
                className={styles.addButton}
                onClick={() => setShowNewProfessional(true)}
              >
                + Novo profissional
              </button>

              <input
                type="text"
                placeholder="Buscar profissional..."
                value={searchProfessional}
                onChange={(e) => setSearchProfessional(e.target.value)}
                className={styles.searchInput}
              />

              <ul className={styles.list}>
                {filteredProfessionals.map((p) => (
                  <li key={p.id}>
                    <button
                      className={`${styles.item} ${
                        p.id === professionalId ? styles.active : ""
                      }`}
                      onClick={async () => {
                        setProfessionalId(p.id);
                        setProfessionalName(p.name);
                        setServiceId("");
                        setServiceDuration(60);
                        await loadServices(p.id);
                      }}
                    >
                      <span className={styles.itemTitle}>{p.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>
                Serviços de {professionalName}
              </h3>

              <button
                className={styles.addButton}
                onClick={() => setShowNewService(true)}
              >
                + Novo serviço
              </button>

              <input
                type="text"
                placeholder="Buscar serviço..."
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                className={styles.searchInput}
              />

              <ul className={styles.list}>
                {filteredServices.map((s) => {
                  const active = s.id === serviceId;
                  const dur = s.duration_min ?? 60;

                  return (
                    <li key={s.id}>
                      <button
                        className={`${styles.item} ${
                          active ? styles.active : ""
                        }`}
                        onClick={() => {
                          setServiceId(s.id);
                          setServiceName(s.name);
                          setServiceDuration(dur ?? 60);
                        }}
                      >
                        <div className={styles.itemCol}>
                          <span className={styles.itemTitle}>
                            {s.name}
                          </span>
                          <span className={styles.badge}>{dur} min</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Cliente</h3>

              <button
                className={styles.addButton}
                onClick={() => setShowNewCustomer(true)}
              >
                + Novo cliente
              </button>

              <SelectClientWhatsApp
                ref={clientRef}
                tenantId={tenantId}
                value={customerId}
                onChange={(id, name) => {
                  setCustomerId(id);
                  setCustomerName(name);
                }}
                onAdd={() => setShowNewCustomer(true)}
              />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Escolha a data</h3>

              <DatePickerModal
                tenantId={tenantId}
                professionalId={professionalId}
                serviceDuration={serviceDuration}
                value={selectedDate || ""}
                onSelect={async (d) => {
                  setSelectedDate(d);
                  setSelectedTime("");
                  await loadTimes(d, professionalId, serviceDuration);
                }}
              />

              {selectedDate && (
                <div className={styles.helper}>
                  <CalendarDays size={20} className={styles.helperIcon} />
                  <div className={styles.helperBody}>
                    <div className={styles.helperLabel}>
                      Data selecionada
                    </div>
                    <div className={styles.helperValue}>
                      <strong>{dateBR(selectedDate)}</strong> —{" "}
                      {weekdayName(selectedDate)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Selecione o horário</h3>

              {availableTimes.length === 0 && (
                <p style={{ color: "#f0ad4e", fontSize: "0.9rem" }}>
                  Nenhum horário disponível nesta data.
                </p>
              )}

              <div className={styles.timeGrid}>
                {availableTimes.map((t) => (
                  <button
                    key={t}
                    className={`${styles.timeBtn} ${
                      t === selectedTime ? styles.timeActive : ""
                    }`}
                    onClick={() => setSelectedTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Confirme os dados</h3>

              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}>
                  <span className={styles.label}>Profissional</span>
                  <span className={styles.value}>{professionalName}</span>
                </div>

                <div className={styles.reviewRow}>
                  <span className={styles.label}>Serviço</span>
                  <span className={styles.value}>
                    {serviceName} ({serviceDuration} min)
                  </span>
                </div>

                <div className={styles.reviewRow}>
                  <span className={styles.label}>Cliente</span>
                  <span className={styles.value}>
                    {customerName || "-"}
                  </span>
                </div>

                <div className={`${styles.reviewRow} ${styles.dateRow}`}>
                  <div className={styles.iconWrapper}>
                    <CalendarDays size={18} />
                    <span className={styles.label}>Data</span>
                  </div>
                  <span className={styles.value}>
                    {dateBR(selectedDate)}
                  </span>
                </div>

                <div className={`${styles.reviewRow} ${styles.timeRow}`}>
                  <div className={styles.iconWrapper}>
                    <Clock size={18} />
                    <span className={styles.label}>Hora</span>
                  </div>
                  <span className={styles.value}>{selectedTime}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.footerNav}>
          {step > 1 ? (
            <button className={styles.prevBtn} onClick={goBack}>
              Anterior
            </button>
          ) : (
            <div />
          )}

          <button
            className={styles.nextBtn}
            disabled={!canNext}
            onClick={goNext}
          >
            {step === totalSteps ? "Agendar" : "Próximo"}
          </button>
        </div>
      </div>

      {/* ------------------------ MODAIS AUXILIARES ------------------------ */}

      {showNewCustomer && (
        <ModalNewCustomer
          tenantId={tenantId}
          mode="agenda"
          show={showNewCustomer}
          onClose={() => setShowNewCustomer(false)}
          onSuccess={(id, name) => {
            setCustomerId(id);
            setCustomerName(name);
            clientRef.current?.reload(id);
            setShowNewCustomer(false);
            toast.success(`Cliente ${name} cadastrado!`);
          }}
        />
      )}

      {showNewProfessional && (
        <ModalNewProfessional
          tenantId={tenantId}
          mode="agenda"
          show={showNewProfessional}
          editId={null}
          onClose={() => setShowNewProfessional(false)}
          onSuccess={async (id, name) => {
            setShowNewProfessional(false);

            const { data } = await supabase
              .from("professionals")
              .select("id,name")
              .order("name");

            const ordered = [
              { id, name },
              ...(data || []).filter((p) => p.id !== id)
            ];

            setProfessionals(ordered);
            setProfessionalId(id);
            setProfessionalName(name);

            await loadServices(id);
            toast.success(`Profissional ${name} cadastrado!`);
          }}
        />
      )}

      {showNewService && (
        <ModalNewService
          tenantId={tenantId}
          mode="agenda"
          show={showNewService}
          onClose={() => setShowNewService(false)}
          onSuccess={async (id, name, duration) => {
            setShowNewService(false);

            const { data } = await supabase
              .from("professional_services")
              .select("service:services(id,name,duration_min)")
              .eq("professional_id", professionalId);

            const ordered = [
              { id, name, duration_min: duration },
              ...(data || [])
                .map((r: any) => r.service)
                .filter((s) => s.id !== id)
            ];

            setServices(ordered);
            setServiceId(id);
            setServiceName(name);
            setServiceDuration(duration || 60);

            toast.success(`Serviço ${name} cadastrado!`);
          }}
        />
      )}
    </div>
  );
}
