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
  Calendar,
} from "lucide-react";
import styles from "../css/Agenda.module.css";
import { getCurrentProfile, supabase } from "../lib/supabaseCleint";

// =============================
// Tipagens
// =============================
interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service_name?: string;
  professional_name?: string;
  customer_name?: string;
  service_id?: string;
  professional_id?: string;
  customer_id?: string;
  avatar_url?: string;
}

interface Service {
  id: string;
  name: string;
}

interface Professional {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  full_name: string;
}

// =============================
// Função auxiliar
// =============================
function getStatusLabel(status: string) {
  switch (status) {
    case "scheduled":
      return "Agendado";
    case "done":
      return "Realizado";
    case "canceled":
      return "Cancelado";
    case "rescheduled":
      return "Reagendado";
    default:
      return status;
  }
}

// =============================
// Componente principal
// =============================
export default function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState("scheduled");

  // Modal principal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos do agendamento
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Mini-modais
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showNewProfessional, setShowNewProfessional] = useState(false);

  // Campos dos mini-modais
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newProfessionalName, setNewProfessionalName] = useState("");
  const [newProfessionalPhone, setNewProfessionalPhone] = useState("");
  const [newProfessionalEmail, setNewProfessionalEmail] = useState("");


  
  // =============================
  // Perfil atual
  // =============================
  useEffect(() => {
    (async () => {
      const profile = await getCurrentProfile();
      if (profile) {
        setTenantId(profile.tenant_id);
        setRole(profile.role);
      }
    })();
  }, []);

  // =============================
  // Data formatada
  // =============================
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(currentDate);

  // =============================
  // Buscar agendamentos
  // =============================
  async function fetchAppointments() {
    if (!tenantId || !role) return;
    setLoading(true);

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id, starts_at, ends_at, status,
        service:services!appointments_service_id_fkey(id, name),
        professional:professionals!appointments_professional_id_fkey(id, name),
        customer:customers!appointments_customer_id_fkey(id, full_name)
      `)
      .eq("tenant_id", tenantId)
      .gte("starts_at", startOfDay.toISOString())
      .lte("ends_at", endOfDay.toISOString())
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar agendamentos:", error);
      setLoading(false);
      return;
    }

    const formatted: Appointment[] = (data || []).map((a: any) => {
      const profName = a.professional?.name ?? "Profissional";
      const avatarUrl = `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(
        profName
      )}`;
      return {
        id: a.id,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        service_name: a.service?.name,
        service_id: a.service?.id,
        professional_name: profName,
        professional_id: a.professional?.id,
        customer_name: a.customer?.full_name,
        customer_id: a.customer?.id,
        avatar_url: avatarUrl,
      };
    });

    setAppointments(formatted);
    setLoading(false);
  }

  useEffect(() => {
    if (tenantId) fetchAppointments();
  }, [tenantId, currentDate]);

  // =============================
  // Abrir modal (novo / editar)
  // =============================
  const openModal = async (appointment?: Appointment) => {
    await loadFormData();

    if (appointment) {
      setEditingId(appointment.id);
      setServiceId(appointment.service_id || "");
      setProfessionalId(appointment.professional_id || "");
      setCustomerId(appointment.customer_id || "");
      setStartTime(new Date(appointment.starts_at).toTimeString().slice(0, 5));
      setEndTime(new Date(appointment.ends_at).toTimeString().slice(0, 5));
      setStatus(appointment.status || "scheduled");
    } else {
      resetForm();
    }

    setShowModal(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setServiceId("");
    setProfessionalId("");
    setCustomerId("");
    setStartTime("");
    setEndTime("");
    setStatus("scheduled");
  };

  // =============================
  // Carregar selects
  // =============================
  async function loadFormData() {
    if (!tenantId) return;
    const [srv, prof, cust] = await Promise.all([
      supabase.from("services").select("id, name").eq("tenant_id", tenantId),
      supabase.from("professionals").select("id, name").eq("tenant_id", tenantId),
      supabase.from("customers").select("id, full_name").eq("tenant_id", tenantId),
    ]);
    setServices(srv.data || []);
    setProfessionals(prof.data || []);
    setCustomers(cust.data || []);
  }

  // =============================
  // Criar novo Cliente / Serviço / Profissional
  // =============================
async function handleCreateCustomer() {
  if (!tenantId || !newCustomerName || !newCustomerPhone) return;
  const { data, error } = await supabase
    .from("customers")
    .insert([{ tenant_id: tenantId, full_name: newCustomerName, customer_phone: newCustomerPhone }])
    .select();

  if (error) {
    toast.error("Erro ao criar cliente!");
    console.error(error);
    return;
  }

  await loadFormData(); // 🔹 Recarrega lista completa
  setCustomerId(data[0].id);
  setShowNewCustomer(false);
  setNewCustomerName("");
  setNewCustomerPhone("");
}

async function handleCreateService() {
  if (!tenantId || !newServiceName) return;
  const { data, error } = await supabase
    .from("services")
    .insert([{ tenant_id: tenantId, name: newServiceName, price_cents: Number(newServicePrice || 0) }])
    .select();

  if (error) {
    toast.error("Erro ao criar serviço!");
    console.error(error);
    return;
  }

  await loadFormData();
  setServiceId(data[0].id);
  setShowNewService(false);
  setNewServiceName("");
  setNewServicePrice("");
}

async function handleCreateProfessional() {
  if (!tenantId || !newProfessionalName) return;
  const { data, error } = await supabase
    .from("professionals")
    .insert([
      {
        tenant_id: tenantId,
        name: newProfessionalName,
        phone: newProfessionalPhone,
        email: newProfessionalEmail,
      },
    ])
    .select();

  if (error) {
    toast.error("Erro ao criar profissional!");
    console.error(error);
    return;
  }

  await loadFormData();
  setProfessionalId(data[0].id);
  setShowNewProfessional(false);
  setNewProfessionalName("");
  setNewProfessionalPhone("");
  setNewProfessionalEmail("");
}

  // =============================
  // Salvar (novo / edição)
  // =============================
async function handleSaveAppointment() {
  if (!tenantId || !serviceId || !professionalId || !customerId || !startTime || !endTime) {
    toast.warn("Preencha todos os campos obrigatórios!");
    return;
  }

  // Busca nome e telefone do cliente
  const { data: clienteData, error: clienteError } = await supabase
    .from("customers")
    .select("full_name, customer_phone")
    .eq("id", customerId)
    .single();

  if (clienteError || !clienteData) {
    toast.error("Erro ao buscar dados do cliente!");
    console.error(clienteError);
    return;
  }

  const starts_at = new Date(`${currentDate.toDateString()} ${startTime}`);
  const ends_at = new Date(`${currentDate.toDateString()} ${endTime}`);

  const payload = {
    tenant_id: tenantId,
    professional_id: professionalId,
    service_id: serviceId,
    customer_id: customerId,
    customer_name: clienteData.full_name || "Cliente",
    customer_phone: clienteData.customer_phone || null,
    starts_at,
    ends_at,
    status,
  };

  console.log("Salvando agendamento:", payload);

  const { error } = editingId
    ? await supabase.from("appointments").update(payload).eq("id", editingId)
    : await supabase.from("appointments").insert([payload]);

  if (error) {
    console.error("Erro ao salvar agendamento:", error);
    toast.error(`Erro ao salvar agendamento: ${error.message}`);
    return;
  }

  toast.success(editingId ? "Agendamento atualizado!" : "Agendamento criado com sucesso!");
  setShowModal(false);
  resetForm();
  fetchAppointments();
}

  // =============================
  // Excluir
  // =============================
  async function handleDeleteAppointment(id: string) {
    if (confirm("Deseja realmente excluir este agendamento?")) {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) console.error("Erro ao excluir:", error);
      fetchAppointments();
    }
  }

  // =============================
  // Navegação
  // =============================
  const handlePrevDay = () =>
    setCurrentDate((prev) => new Date(prev.getTime() - 86400000));
  const handleNextDay = () =>
    setCurrentDate((prev) => new Date(prev.getTime() + 86400000));

  // =============================
  // Render
  // =============================
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Agenda</h2>
        {role === "manager" && (
          <button onClick={() => openModal()} className={styles.newButton}>
            <Plus size={18} /> Novo Agendamento
          </button>
        )}
      </div>

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
        {loading ? (
          <p className={styles.loading}>Carregando...</p>
        ) : appointments.length === 0 ? (
          <p className={styles.empty}>Nenhum agendamento neste dia.</p>
        ) : (
          appointments.map((a) => (
            <div key={a.id} className={styles.card}>
              <img className={styles.avatar} src={a.avatar_url} alt={a.professional_name || "Profissional"} />
              <div className={styles.details}>
                <strong className={styles.time}>
                  {new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {new Date(a.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </strong>
                <p className={styles.desc}>
                  {a.service_name} <span className={styles.with}>com</span> {a.professional_name}
                </p>
                <p className={styles.client}>Cliente: {a.customer_name}</p>
              </div>

              <div className={styles.cardActions}>
                {role === "manager" ? (
                  <select
                    className={styles.statusSelect}
                    value={a.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      const result = await Swal.fire({
                        title: "Confirmar alteração?",
                        text: `Alterar status para "${getStatusLabel(newStatus)}"?`,
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonText: "Sim",
                        cancelButtonText: "Cancelar",
                      });
                      if (!result.isConfirmed) return;
                      const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", a.id);
                      if (error) return toast.error("Erro ao alterar status!");
                      setAppointments((prev) =>
                        prev.map((x) => (x.id === a.id ? { ...x, status: newStatus } : x))
                      );
                      toast.success(`Status alterado para "${getStatusLabel(newStatus)}"`);
                    }}
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="done">Realizado</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                ) : (
                  <span className={`${styles.status} ${styles.badgeInfo}`}>{getStatusLabel(a.status)}</span>
                )}

                {role === "manager" && (
                  <>
                    <button onClick={() => openModal(a)} className={styles.iconButton} title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteAppointment(a.id)} className={styles.iconButtonDelete} title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* =======================
          MODAL PRINCIPAL
      ======================= */}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <button onClick={() => setShowModal(false)} className={styles.closeBtn}>
              <X size={20} />
            </button>
            <h3>{editingId ? "Editar Agendamento" : "Novo Agendamento"}</h3>

            {/* Serviço */}
            <label>Serviço</label>
            <div className={styles.rowWithButton}>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={styles.input}>
                <option value="">Selecione</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setShowNewService(true)} className={styles.smallBtn}>
                <Plus size={16} />
              </button>
            </div>

            {/* Profissional */}
            <label>Profissional</label>
            <div className={styles.rowWithButton}>
              <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} className={styles.input}>
                <option value="">Selecione</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setShowNewProfessional(true)} className={styles.smallBtn}>
                <Plus size={16} />
              </button>
            </div>

            {/* Cliente */}
            <label>Cliente</label>
            <div className={styles.rowWithButton}>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={styles.input}>
                <option value="">Selecione</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setShowNewCustomer(true)} className={styles.smallBtn}>
                <Plus size={16} />
              </button>
            </div>

            {/* Horários */}
            <div className={styles.timeRow}>
              <div>
                <label>Início</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div>
                <label>Término</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <button onClick={handleSaveAppointment} className={styles.saveButton}>
              {editingId ? "Salvar Alterações" : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* MINI MODAIS */}
      {showNewCustomer && (
        <div className={styles.modal}>
          <div className={styles.modalContentSmall}>
            <button onClick={() => setShowNewCustomer(false)} className={styles.closeBtn}>
              <X size={20} />
            </button>
            <h4>Novo Cliente</h4>
            <input placeholder="Nome completo" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className={styles.input} />
            <input placeholder="Telefone" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className={styles.input} />
            <button onClick={handleCreateCustomer} className={styles.saveButton}>
              Salvar Cliente
            </button>
          </div>
        </div>
      )}

      {showNewService && (
        <div className={styles.modal}>
          <div className={styles.modalContentSmall}>
            <button onClick={() => setShowNewService(false)} className={styles.closeBtn}>
              <X size={20} />
            </button>
            <h4>Novo Serviço</h4>
            <input placeholder="Nome do serviço" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} className={styles.input} />
            <input placeholder="Preço (em reais)" type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} className={styles.input} />
            <button onClick={handleCreateService} className={styles.saveButton}>
              Salvar Serviço
            </button>
          </div>
        </div>
      )}

      {showNewProfessional && (
        <div className={styles.modal}>
          <div className={styles.modalContentSmall}>
            <button onClick={() => setShowNewProfessional(false)} className={styles.closeBtn}>
              <X size={20} />
            </button>
            <h4>Novo Profissional</h4>
            <input placeholder="Nome completo" value={newProfessionalName} onChange={(e) => setNewProfessionalName(e.target.value)} className={styles.input} />
            <input placeholder="Telefone" value={newProfessionalPhone} onChange={(e) => setNewProfessionalPhone(e.target.value)} className={styles.input} />
            <input placeholder="E-mail" value={newProfessionalEmail} onChange={(e) => setNewProfessionalEmail(e.target.value)} className={styles.input} />
            <button onClick={handleCreateProfessional} className={styles.saveButton}>
              Salvar Profissional
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
