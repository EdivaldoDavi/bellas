import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "react-toastify";
import styles from "../../css/AgendaWizard.module.css";
import { supabase } from "../../lib/supabaseCleint";

import DatePickerModal from "../../components/DatePickerModal";
import SelectClientWhatsApp from "../../components/SelectClientWhatsapp";
import NewCustomerForm from "../../components/ModalNewCustomer";
import ModalNewService from "../../components/ModalNewService";
import ModalNewProfessional from "../../components/ModalNewProfessional";

import { CalendarDays, Clock, User, Scissors } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  combineLocalDateTime,
  weekdayName,
  dateBR
} from "../../utils/date";

import { getAvailableTimeSlots } from "../../utils/schedule";
import { dbPhoneToMasked } from "../../utils/phoneUtils";

type Professional = { id: string; name: string; phone: string | null };
type Service = { id: string; name: string; duration_min?: number | null };

export default function ScheduleWizardPage() {
  const { theme } = useTheme();
  const { tenant } = useUserAndTenant();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnTo = searchParams.get("returnTo") || "/agenda";

  function safeClose() {
    navigate(returnTo);
  }

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
  const [serviceDuration, setServiceDuration] = useState<number>(60);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [, setCustomerPhone] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  /* -------------------------------- RESET -------------------------------- */
  function resetAll() {
    setStep(1);
    setProfessionalId("");
    setProfessionalName("");
    setServiceId("");
    setServiceName("");
    setServiceDuration(60);

    setCustomerId("");
    setCustomerName("");
    setCustomerPhone(null);
    setSelectedDate("");
    setSelectedTime("");
    setAvailableTimes([]);
  }

  function handleClose() {
    resetAll();
    safeClose();
  }

  /* ----------------------------- LOAD INICIAL ----------------------------- */
  useEffect(() => {
    resetAll();
    loadProfessionals();
    // Garantir tema aplicado
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, []);

  /* ------------------------------ LOAD DATA ------------------------------- */
  async function loadProfessionals() {
    const { data } = await supabase
      .from("professionals")
      .select("id,name,phone")
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

    const tenantId = tenant?.id;
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
      case 2: return !!serviceId;
      case 3: return !!customerId;
      case 4: return !!selectedDate;
      case 5: return !!selectedTime;
      default: return true;
    }
  }, [
    step,
    professionalId,
    serviceId,
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
    if (saving) return;
    setSaving(true);
    
    const tenantId = tenant?.id;
    if (!tenantId) {
      setSaving(false);
      toast.error("Tenant não encontrado.");
      return;
    }

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
      setSaving(false);
      toast.error("Erro ao agendar.");
      return;
    }

    toast.success("Agendado com sucesso!", { toastId: "appointment_success" });

    // Ao concluir, voltar para a página definida com sinalizador de atualização
    const url = new URL(window.location.origin + returnTo);
    url.searchParams.set("refreshAppointments", "1");
    navigate(url.pathname + url.search, { replace: true });
  }

  /* ------------------------------ RENDER JSX ------------------------------ */
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
    <div className={styles.overlay}>
      <div className={styles.modal}>
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
          {/* STEP 1 — PROFISSIONAL */}
          {step === 1 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Quem vai atender?</h3>
              <p className={styles.stepDescription}>
                Selecione o profissional que realizará o serviço.
              </p>

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
                      <User size={20} className={styles.itemIcon} />
                      <div className={styles.itemContent}>
                        <span className={styles.itemTitle}>{p.name}</span>
                        {p.phone && (
                          <span className={styles.itemSub}>
                            {dbPhoneToMasked(p.phone)}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <p className={styles.stepDescription}>
                Se for preciso, cadastre um novo:
              </p>
              <button
                className={styles.primaryActionButton}
                onClick={() => setShowNewProfessional(true)}
              >
                + Novo profissional
              </button>
            </div>
          )}

          {/* STEP 2 — SERVIÇO */}
          {step === 2 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Qual serviço será realizado?</h3>
              <p className={styles.stepDescription}>
                Escolha o serviço que {professionalName} irá oferecer.
              </p>

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
                          setServiceDuration(dur);
                        }}
                      >
                        <Scissors size={20} className={styles.itemIcon} />
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>{s.name}</span>
                          <span className={styles.itemSub}>{dur} min</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className={styles.stepDescription}>
                Se for preciso, cadastre um novo:
              </p>
              <button
                className={styles.primaryActionButton}
                onClick={() => setShowNewService(true)}
              >
                + Novo serviço
              </button>
            </div>
          )}

          {/* STEP 3 — CLIENTE */}
          {step === 3 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Quem é o cliente?</h3>
              <p className={styles.stepDescription}>
                Selecione o cliente para este agendamento.
              </p>

              <SelectClientWhatsApp
                ref={clientRef}
                tenantId={tenant?.id || ""}
                value={customerId}
                hideAddButton={false}
                onChange={async (id, name) => {
                  setCustomerId(id);
                  setCustomerName(name);
                  try {
                    const { data } = await supabase.from('customers').select('customer_phone').eq('id', id).single();
                    setCustomerPhone(data?.customer_phone || null);
                  } catch (error) {
                    console.error("Error fetching customer phone:", error);
                  }
                }}
                onAdd={() => setShowNewCustomer(true)}
              />
            </div>
          )}

          {/* STEP 4 — DATA */}
          {step === 4 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Escolha a data</h3>
              <p className={styles.stepDescription}>
                Selecione o dia em que o serviço será realizado.
              </p>

              <DatePickerModal
                tenantId={tenant?.id || ""}
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
                    <div className={styles.helperLabel}>Data selecionada</div>
                    <div className={styles.helperValue}>
                      <strong>{dateBR(selectedDate)}</strong> —{" "}
                      {weekdayName(selectedDate)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 — HORÁRIO */}
          {step === 5 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Selecione o horário</h3>
              <p className={styles.stepDescription}>
                Escolha um horário disponível para o serviço.
              </p>

              {availableTimes.length === 0 && (
                <p className={styles.emptyText}>
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

          {/* STEP 6 — REVISÃO */}
          {step === 6 && (
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Confirme os dados</h3>
              <p className={styles.stepDescription}>
                Revise todas as informações antes de finalizar o agendamento.
              </p>

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
                  <span className={styles.value}>{dateBR(selectedDate)}</span>
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
            disabled={!canNext || saving}
            onClick={goNext}
          >
            {step === totalSteps ? "Agendar" : "Próximo"}
          </button>
        </div>
      </div>

      {/* ------------------------ MODAIS AUXILIARES ------------------------ */}

      {showNewCustomer && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <NewCustomerForm
              tenantId={tenant?.id || ""}
              mode="new"
              onCancel={() => setShowNewCustomer(false)}
              onSaveSuccess={(id, name) => {
                setCustomerId(id);
                setCustomerName(name);
                clientRef.current?.reload(id);
                setShowNewCustomer(false);
                toast.success(`Cliente ${name} cadastrado!`);
              }}
            />
          </div>
        </div>
      )}

      {showNewProfessional && (
        <ModalNewProfessional
          tenantId={tenant?.id || ""}
          mode="agenda"
          show={showNewProfessional}
          editId={null}
          onClose={() => setShowNewProfessional(false)}
          onSuccess={async (id, name) => {
            setShowNewProfessional(false);

            const { data } = await supabase
              .from("professionals")
              .select("id,name,phone")
              .order("name");

            const ordered = [
              { id, name, phone: null },
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
          tenantId={tenant?.id || ""}
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