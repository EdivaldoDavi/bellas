import { useEffect,  useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

import ModalPickServicesForProfessional from "./ModalPickServicesForProfessional";
import styles from "../css/ModalNewProfessional.module.css";

interface ModalNewProfessionalProps {
  tenantId?: string;
  show: boolean;
  mode?: "agenda" | "cadastro";
  onClose: () => void;
  onSuccess?: (id: string, name: string) => void;
  editId?: string | null;
}

type Service = { id: string; name: string; duration_min?: number | null };

const WEEKDAYS_FULL = [
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
  { id: 7, label: "Domingo" },
];

type DayRow = {
  weekday: number;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
};

function padSeconds(t: string) {
  return t && t.length === 5 ? `${t}:00` : t;
}

function stripSeconds(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

export default function ModalNewProfessional({
  tenantId,
  show,

  onClose,
  onSuccess,
  editId,
}: ModalNewProfessionalProps) {
  const isEditing = !!editId;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showServicesModal, setShowServicesModal] = useState(false);

  

  const [copyToWeek, setCopyToWeek] = useState(true);
  const [monStart, setMonStart] = useState("09:00");
  const [monEnd, setMonEnd] = useState("18:00");
  const [monBreakStart, setMonBreakStart] = useState("00:00");
  const [monBreakEnd, setMonBreakEnd] = useState("00:00");

  const emptyWeekRows: DayRow[] = WEEKDAYS_FULL.map(d => ({
    weekday: d.id,
    start: "",
    end: "",
    breakStart: "",
    breakEnd: "",
  }));

  const [weekRows, setWeekRows] = useState(emptyWeekRows);

  // RESET
  useEffect(() => {
    if (show && !isEditing) {
      setName("");
      setEmail("");
      setPhone("");
      setSelectedServices([]);
      setCopyToWeek(true);
      setMonStart("09:00");
      setMonEnd("18:00");
      setMonBreakStart("00:00");
      setMonBreakEnd("00:00");
      setWeekRows(emptyWeekRows);
    }
  }, [show, isEditing]);

  // LOAD SERVICES
  useEffect(() => {
    if (show && tenantId) {
      supabase
        .from("services")
        .select("id,name,duration_min")
        .eq("tenant_id", tenantId)
        .order("name")
        .then(({ data, error }) => {
          if (error) toast.error("Erro ao carregar serviços");
          else setServices(data || []);
        });
    }
  }, [show, tenantId]);

  // LOAD PROFESSIONAL (EDIT)
  useEffect(() => {
    if (!show || !tenantId || !editId) return;

    (async () => {
      try {
        setInitialLoading(true);

        const { data: prof } = await supabase
          .from("professionals")
          .select("name,email,phone")
          .eq("tenant_id", tenantId)
          .eq("id", editId)
          .single();

        if (!prof) return;

        setName(prof.name);
        setEmail(prof.email);
        setPhone(prof.phone);

        const { data: links } = await supabase
          .from("professional_services")
          .select("service_id")
          .eq("tenant_id", tenantId)
          .eq("professional_id", editId);

        setSelectedServices(links?.map(l => l.service_id) || []);

        const { data: scheds } = await supabase
          .from("professional_schedules")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("professional_id", editId);

        if (scheds && scheds.length) {
          const rows = emptyWeekRows.map(r => ({ ...r }));
          scheds.forEach(s => {
            const w = rows.find(r => r.weekday === s.weekday);
            if (w) {
              w.start = stripSeconds(s.start_time);
              w.end = stripSeconds(s.end_time);
              w.breakStart = stripSeconds(s.break_start_time);
              w.breakEnd = stripSeconds(s.break_end_time);
            }
          });
          setWeekRows(rows);
          setCopyToWeek(false);
        }
      } catch {
        toast.error("Erro ao carregar profissional.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [show, tenantId, editId]);

  function buildScheduleRows(id: string) {
    const rows: any[] = [];
    if (copyToWeek) {
      for (let d = 1; d <= 6; d++) {
        rows.push({
          tenant_id: tenantId,
          professional_id: id,
          weekday: d,
          start_time: padSeconds(monStart),
          end_time: padSeconds(monEnd),
          break_start_time: padSeconds(monBreakStart),
          break_end_time: padSeconds(monBreakEnd),
        });
      }
    } else {
      weekRows.forEach(w => {
        if (w.start && w.end) {
          rows.push({
            tenant_id: tenantId,
            professional_id: id,
            weekday: w.weekday,
            start_time: padSeconds(w.start),
            end_time: padSeconds(w.end),
            break_start_time: padSeconds(w.breakStart),
            break_end_time: padSeconds(w.breakEnd),
          });
        }
      });
    }
    return rows;
  }

  async function handleSave() {
    if (!tenantId) return toast.error("Tenant não encontrado.");
    if (!name.trim()) return toast.warn("Informe o nome");
    if (!selectedServices.length) return toast.warn("Selecione ao menos um serviço");

    setSaving(true);

    try {
      let id = editId;

      // INSERT
      if (!isEditing) {
        const { data: prof, error } = await supabase
          .from("professionals")
          .insert([
            { tenant_id: tenantId, name, email: email || null, phone: phone || null },
          ])
          .select()
          .single();

        if (error || !prof) throw error;
        id = prof.id;
      }
      // UPDATE
      else if (id) {
        await supabase
          .from("professionals")
          .update({ name, email: email || null, phone: phone || null })
          .eq("tenant_id", tenantId)
          .eq("id", id);
      }

      if (!id) return;

      // SERVICES
      await supabase
        .from("professional_services")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", id);

      await supabase
        .from("professional_services")
        .insert(selectedServices.map(s => ({
          tenant_id: tenantId,
          professional_id: id!,
          service_id: s,
        })));

      // SCHEDULES
      await supabase
        .from("professional_schedules")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", id);

      await supabase
        .from("professional_schedules")
        .insert(buildScheduleRows(id));

      toast.success(isEditing ? "Profissional atualizado!" : "Profissional cadastrado!");

      onSuccess?.(id, name);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar profissional.");
    }

    setSaving(false);
  }

  if (!show) return null;

  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>

          <h3>{isEditing ? "Editar profissional" : "Novo profissional"}</h3>

          {initialLoading ? (
            <p className={styles.emptyText}>Carregando dados...</p>
          ) : (
            <>
              <input
                className={styles.input}
                placeholder="Nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <input
                className={styles.input}
                placeholder="E-mail (opcional)"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <input
                className={styles.input}
                placeholder="Telefone (opcional)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />

              <h4>Serviços que executa</h4>
              <div className={styles.servicesRow}>
                <button
                  className={styles.selectServicesBtn}
                  onClick={() => setShowServicesModal(true)}
                >
                  Selecionar serviços
                </button>
                <span className={styles.selectedSummary}>
                  {selectedServices.length === 0
                    ? "Nenhum serviço selecionado"
                    : `${selectedServices.length} serviço(s) selecionado(s)`}
                </span>
              </div>

              <h4>Horários de trabalho</h4>

              <label className={styles.copyRow}>
                <input
                  type="checkbox"
                  checked={copyToWeek}
                  onChange={e => setCopyToWeek(e.target.checked)}
                />
                <span>Copiar segunda para todos os dias</span>
              </label>

              {copyToWeek ? (
                <>
                  <div className={styles.dayTitle}>Segunda-feira</div>
                  <div className={styles.timeGrid}>
                    <div>
                      <label>Entrada</label>
                      <input
                        type="time"
                        value={monStart}
                        onChange={e => setMonStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Saída</label>
                      <input
                        type="time"
                        value={monEnd}
                        onChange={e => setMonEnd(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Almoço início</label>
                      <input
                        type="time"
                        value={monBreakStart}
                        onChange={e => setMonBreakStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Almoço fim</label>
                      <input
                        type="time"
                        value={monBreakEnd}
                        onChange={e => setMonBreakEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                WEEKDAYS_FULL.map(d => {
                  const row = weekRows.find(r => r.weekday === d.id)!;
                  return (
                    <div key={d.id} className={styles.dayBlock}>
                      <div className={styles.dayTitle}>{d.label}</div>
                      <div className={styles.timeGrid}>
                        <div>
                          <label>Entrada</label>
                          <input
                            type="time"
                            value={row.start}
                            onChange={e =>
                              setWeekRows(prev =>
                                prev.map(w =>
                                  w.weekday === d.id
                                    ? { ...w, start: e.target.value }
                                    : w
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Saída</label>
                          <input
                            type="time"
                            value={row.end}
                            onChange={e =>
                              setWeekRows(prev =>
                                prev.map(w =>
                                  w.weekday === d.id
                                    ? { ...w, end: e.target.value }
                                    : w
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Almoço início</label>
                          <input
                            type="time"
                            value={row.breakStart}
                            onChange={e =>
                              setWeekRows(prev =>
                                prev.map(w =>
                                  w.weekday === d.id
                                    ? { ...w, breakStart: e.target.value }
                                    : w
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label>Almoço fim</label>
                          <input
                            type="time"
                            value={row.breakEnd}
                            onChange={e =>
                              setWeekRows(prev =>
                                prev.map(w =>
                                  w.weekday === d.id
                                    ? { ...w, breakEnd: e.target.value }
                                    : w
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Salvando..."
                  : isEditing
                  ? "Salvar alterações"
                  : "Salvar profissional"}
              </button>
            </>
          )}
        </div>
      </div>

      <ModalPickServicesForProfessional
        show={showServicesModal}
        services={services}
        selectedIds={selectedServices}
        onClose={() => setShowServicesModal(false)}
        onSave={(ids: any) => {
          setSelectedServices(ids);
          setShowServicesModal(false);
        }}
      />
    </>
  );
}
