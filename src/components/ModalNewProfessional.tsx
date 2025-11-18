import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import styles from "../css/ModalNewProfessional.module.css";

interface ModalNewProfessionalProps {
  tenantId?: string;
  show: boolean;
  mode?: "agenda" | "cadastro"; // como será usado
  onClose: () => void;
  onSuccess?: (id?: string, name?: string) => void;

  /** ID do profissional para edição (opcional) */
  editId?: string | null;
}

type Service = { id: string; name: string; duration_min?: number };

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

function stripSeconds(t: string | null | undefined) {
  if (!t) return "";
  // assume formato HH:MM:SS
  if (t.length >= 5) return t.slice(0, 5);
  return t;
}

export default function ModalNewProfessional({
  tenantId,
  show,
  mode = "agenda",
  onClose,
  onSuccess,
  editId,
}: ModalNewProfessionalProps) {
  const isEditing = !!editId;

  // ================= STATE =================
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const hasServices = useMemo(
    () => selectedServices.length > 0,
    [selectedServices]
  );

  const [copyToWeek, setCopyToWeek] = useState(true);
  const [monStart, setMonStart] = useState("09:00");
  const [monEnd, setMonEnd] = useState("18:00");
  const [monBreakStart, setMonBreakStart] = useState("00:00");
  const [monBreakEnd, setMonBreakEnd] = useState("00:00");

  const emptyWeekRows: DayRow[] = WEEKDAYS_FULL.map((d) => ({
    weekday: d.id,
    start: "",
    end: "",
    breakStart: "",
    breakEnd: "",
  }));

  const [weekRows, setWeekRows] = useState<DayRow[]>(emptyWeekRows);

  // ================= RESET AO ABRIR (APENAS NOVO) =================
  useEffect(() => {
    if (!show) return;

    if (!isEditing) {
      // NOVO cadastro
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

  // ================= CARREGAR SERVIÇOS =================
  useEffect(() => {
    if (!show || !tenantId) return;

    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,duration_min")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) {
        console.error(error);
        toast.error("Erro ao carregar serviços");
        return;
      }

      setServices(data || []);
    })();
  }, [tenantId, show]);

  // ================= CARREGAR DADOS PARA EDIÇÃO =================
  useEffect(() => {
    if (!show || !tenantId || !editId) return;

    (async () => {
      try {
        setInitialLoading(true);

        // 1️⃣ Carregar dados básicos do profissional
        const { data: prof, error: profErr } = await supabase
          .from("professionals")
          .select("id, name, email, phone")
          .eq("tenant_id", tenantId)
          .eq("id", editId)
          .single();

        if (profErr || !prof) {
          console.error("Erro ao carregar profissional:", profErr);
          toast.error("Erro ao carregar profissional.");
          return;
        }

        setName(prof.name || "");
        setEmail(prof.email || "");
        setPhone(prof.phone || "");

        // 2️⃣ Carregar serviços vinculados
        const { data: links, error: linksErr } = await supabase
          .from("professional_services")
          .select("service_id")
          .eq("tenant_id", tenantId)
          .eq("professional_id", editId);

        if (linksErr) {
          console.error("Erro ao carregar serviços do profissional:", linksErr);
          toast.error("Erro ao carregar serviços do profissional.");
        } else {
          setSelectedServices((links || []).map((l) => l.service_id));
        }

        // 3️⃣ Carregar horários
        const { data: scheds, error: schedErr } = await supabase
          .from("professional_schedules")
          .select(
            "weekday, start_time, end_time, break_start_time, break_end_time"
          )
          .eq("tenant_id", tenantId)
          .eq("professional_id", editId);

        if (schedErr) {
          console.error("Erro ao carregar horários do profissional:", schedErr);
          toast.error("Erro ao carregar horários do profissional.");
        } else if (scheds && scheds.length > 0) {
          const rows = emptyWeekRows.map((r) => ({ ...r }));
          scheds.forEach((s) => {
            const idx = rows.findIndex((r) => r.weekday === s.weekday);
            if (idx >= 0) {
              rows[idx] = {
                weekday: s.weekday,
                start: stripSeconds(s.start_time),
                end: stripSeconds(s.end_time),
                breakStart: stripSeconds(s.break_start_time),
                breakEnd: stripSeconds(s.break_end_time),
              };
            }
          });
          setWeekRows(rows);
          setCopyToWeek(false); // ao editar, mostra dia a dia
        }
      } catch (err) {
        console.error("Erro inesperado ao carregar profissional:", err);
        toast.error("Erro inesperado ao carregar profissional.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [show, tenantId, editId]);

  // ================= TOGGLE SERVIÇO =================
  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // ================= EDITAR LINHA DE DIA =================
  function updateRow(
    weekday: number,
    field: keyof Omit<DayRow, "weekday">,
    value: string
  ) {
    setWeekRows((prev) =>
      prev.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r))
    );
  }

  // ================= MONTAR HORÁRIOS =================
  function buildScheduleRows(professionalId: string) {
    const rows: any[] = [];

    if (copyToWeek) {
      const ws = padSeconds(monStart);
      const we = padSeconds(monEnd);
      const bs = padSeconds(monBreakStart);
      const be = padSeconds(monBreakEnd);

      // Segunda (1) até Sábado (6)
      for (let d = 1; d <= 6; d++) {
        rows.push({
          tenant_id: tenantId,
          professional_id: professionalId,
          weekday: d,
          start_time: ws,
          end_time: we,
          break_start_time: bs,
          break_end_time: be,
        });
      }
    } else {
      weekRows.forEach((r) => {
        if (!r.start || !r.end) return;
        rows.push({
          tenant_id: tenantId,
          professional_id: professionalId,
          weekday: r.weekday,
          start_time: padSeconds(r.start),
          end_time: padSeconds(r.end),
          break_start_time: padSeconds(r.breakStart),
          break_end_time: padSeconds(r.breakEnd),
        });
      });
    }

    return rows;
  }

  // ================= SALVAR =================
  async function handleSave() {
    if (!tenantId) {
      toast.error("Tenant não encontrado.");
      return;
    }

    if (!name.trim()) {
      toast.warn("Informe o nome");
      return;
    }

    if (!hasServices) {
      toast.warn("Selecione ao menos um serviço");
      return;
    }

    setSaving(true);

    try {
      let professionalId = editId as string | undefined;

      // ========================================
      // 1️⃣ INSERIR ou ATUALIZAR PROFESSIONAL
      // ========================================
      if (isEditing && professionalId) {
        const { error: updErr } = await supabase
          .from("professionals")
          .update({
            name: name.trim(),
            email: email || null,
            phone: phone || null,
          })
          .eq("tenant_id", tenantId)
          .eq("id", professionalId);

        if (updErr) {
          console.error("Erro ao atualizar profissional:", updErr);
          toast.error("Erro ao atualizar profissional.");
          setSaving(false);
          return;
        }
      } else {
        const { data: prof, error: profErr } = await supabase
          .from("professionals")
          .insert([
            {
              tenant_id: tenantId,
              name: name.trim(),
              email: email || null,
              phone: phone || null,
            },
          ])
          .select()
          .single();

        if (profErr || !prof) {
          console.error("Erro ao cadastrar profissional:", profErr);
          toast.error("Erro ao cadastrar profissional");
          setSaving(false);
          return;
        }

        professionalId = prof.id as string;
      }

      if (!professionalId) {
        toast.error("Erro: ID do profissional não encontrado.");
        setSaving(false);
        return;
      }

      // ========================================
      // 2️⃣ SERVIÇOS (limpa e recria)
      // ========================================
      const { error: delServicesErr } = await supabase
        .from("professional_services")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (delServicesErr) {
        console.error("Erro ao limpar serviços:", delServicesErr);
        toast.error("Erro ao atualizar serviços do profissional.");
      }

      const serviceRows = selectedServices.map((sid) => ({
        tenant_id: tenantId,
        professional_id: professionalId!,
        service_id: sid,
      }));

      if (serviceRows.length > 0) {
        const { error: linkErr } = await supabase
          .from("professional_services")
          .insert(serviceRows);

        if (linkErr) {
          console.error("Erro ao vincular serviços:", linkErr);
          toast.error(
            "Profissional salvo, mas houve erro ao vincular serviços."
          );
        }
      }

      // ========================================
      // 3️⃣ HORÁRIOS (limpa e recria)
      // ========================================
      const { error: delSchedErr } = await supabase
        .from("professional_schedules")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (delSchedErr) {
        console.error("Erro ao limpar horários:", delSchedErr);
        toast.error("Erro ao atualizar horários do profissional.");
      }

      const scheduleRows = buildScheduleRows(professionalId);

      if (scheduleRows.length > 0) {
        const { error: schedErr } = await supabase
          .from("professional_schedules")
          .insert(scheduleRows);

        if (schedErr) {
          console.error("Erro ao salvar horários:", schedErr);
          toast.error(
            "Profissional salvo, mas houve erro ao salvar horários."
          );
        }
      }

      // ========================================
      // 4️⃣ TOAST + CALLBACK
      // ========================================
      if (isEditing) {
        toast.success("Profissional atualizado!");
      } else {
        toast.success("Profissional cadastrado!");
      }

      if (mode === "agenda") {
        onSuccess?.(professionalId, name.trim());
        onClose();
      } else {
        // cadastro (tela de profissionais / cadastros)
        onSuccess?.(professionalId, name.trim());

        if (isEditing) {
          // edição: fecha modal
          onClose();
        } else {
          // novo cadastro: limpa para continuar cadastrando, se quiser
          setName("");
          setEmail("");
          setPhone("");
          setSelectedServices([]);
          setWeekRows(emptyWeekRows);
          toast.success("Pronto! Pode cadastrar outro profissional.");
        }
      }
    } catch (err: any) {
      console.error("Erro inesperado ao salvar profissional:", err);
      toast.error("Erro inesperado ao salvar profissional.");
    }

    setSaving(false);
  }

  if (!show) return null;

  // ================= RENDER =================
  return (
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
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className={styles.input}
              placeholder="E-mail (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className={styles.input}
              placeholder="Telefone (opcional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <h4>Serviços que executa</h4>
            {services.length === 0 ? (
              <p className={styles.emptyText}>
                Nenhum serviço cadastrado ainda. Cadastre serviços primeiro.
              </p>
            ) : (
              <div className={styles.checkList}>
                {services.map((s) => (
                  <label key={s.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}

            <h4>Horários de trabalho</h4>

            <label className={styles.copyRow}>
              <input
                type="checkbox"
                checked={copyToWeek}
                onChange={() => setCopyToWeek((v) => !v)}
              />
              Copiar segunda para todos os dias
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
                      onChange={(e) => setMonStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Saída</label>
                    <input
                      type="time"
                      value={monEnd}
                      onChange={(e) => setMonEnd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Almoço início</label>
                    <input
                      type="time"
                      value={monBreakStart}
                      onChange={(e) => setMonBreakStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Almoço fim</label>
                    <input
                      type="time"
                      value={monBreakEnd}
                      onChange={(e) => setMonBreakEnd(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              WEEKDAYS_FULL.map((d) => {
                const row = weekRows.find((r) => r.weekday === d.id)!;
                return (
                  <div key={d.id} className={styles.dayBlock}>
                    <div className={styles.dayTitle}>{d.label}</div>
                    <div className={styles.timeGrid}>
                      <div>
                        <label>Entrada</label>
                        <input
                          type="time"
                          value={row.start}
                          onChange={(e) =>
                            updateRow(d.id, "start", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label>Saída</label>
                        <input
                          type="time"
                          value={row.end}
                          onChange={(e) =>
                            updateRow(d.id, "end", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label>Almoço início</label>
                        <input
                          type="time"
                          value={row.breakStart}
                          onChange={(e) =>
                            updateRow(d.id, "breakStart", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label>Almoço fim</label>
                        <input
                          type="time"
                          value={row.breakEnd}
                          onChange={(e) =>
                            updateRow(d.id, "breakEnd", e.target.value)
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
  );
}
