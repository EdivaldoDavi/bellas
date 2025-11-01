import { useEffect, useMemo, useState } from "react";
import styles from "../css/Agenda.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface ModalNewProfessionalProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

type Service = { id: string; name: string; duration_min?: number };

const WEEKDAYS_FULL = [
  { id: 1, label: "Segunda" },
  { id: 2, label: "Terça" },
  { id: 3, label: "Quarta" },
  { id: 4, label: "Quinta" },
  { id: 5, label: "Sexta" },
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
  // "" -> "", "09:00" -> "09:00:00", "09:00:30" -> "09:00:30"
  if (!t) return "";
  return t.length === 5 ? `${t}:00` : t;
}

function toMinutes(t: string) {
  // aceita "HH:MM" ou "HH:MM:SS"
  if (!t) return null;
  const [hh, mm] = t.split(":");
  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export default function ModalNewProfessional({
  tenantId,
  onClose,
  onCreated,
}: ModalNewProfessionalProps) {
  // dados do profissional
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // serviços
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const hasServices = useMemo(() => selectedServices.length > 0, [selectedServices]);

  // horários (modo “copia semana”: só segunda)
  const [copyToWeek, setCopyToWeek] = useState(true);
  const [monStart, setMonStart] = useState("09:00");
  const [monEnd, setMonEnd] = useState("18:00");
  const [monBreakStart, setMonBreakStart] = useState("00:00");
  const [monBreakEnd, setMonBreakEnd] = useState("00:00");

  // horários (modo avançado: toda a semana)
  const [weekRows, setWeekRows] = useState<DayRow[]>(
    WEEKDAYS_FULL.map((d) => ({
      weekday: d.id,
      start: "",
      end: "",
      breakStart: "",
      breakEnd: "",
    }))
  );

  // carregar serviços do tenant
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,duration_min")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) {
        toast.error("Erro ao carregar serviços");
        return;
      }
      setServices(data || []);
    })();
  }, [tenantId]);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function updateRow(weekday: number, field: keyof Omit<DayRow, "weekday">, value: string) {
    setWeekRows((prev) =>
      prev.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r))
    );
  }

function validateBreaks(
  workStart: string,
  workEnd: string,
  bStart: string,
  bEnd: string
) {
  const ws = padSeconds(workStart);
  const we = padSeconds(workEnd);
  const wStartMin = toMinutes(ws)!;
  const wEndMin = toMinutes(we)!;

  // turno deve ser válido
  if (!(wStartMin < wEndMin)) {
    toast.warn("Horário de trabalho inválido.");
    return null;
  }

  // Nenhum intervalo → sem intervalo (00:00:00)
  if ((!bStart && !bEnd) || (bStart === "00:00" && bEnd === "00:00")) {
    return { breakStart: "00:00:00", breakEnd: "00:00:00" };
  }

  // Um só preenchido → erro
  if ((bStart && !bEnd) || (!bStart && bEnd)) {
    toast.warn("Informe início e fim do intervalo ou deixe ambos vazios.");
    return null;
  }

  // Normaliza
  const bs = padSeconds(bStart);
  const be = padSeconds(bEnd);
  const bStartMin = toMinutes(bs)!;
  const bEndMin = toMinutes(be)!;

  // Verifica intervalo normal
  if (!(bStartMin < bEndMin)) {
    toast.warn("O intervalo deve terminar depois que começa.");
    return null;
  }

  // Dentro do expediente
  if (bStartMin < wStartMin || bEndMin > wEndMin) {
    toast.warn("Intervalo deve estar dentro do horário de trabalho.");
    return null;
  }

  return { breakStart: bs, breakEnd: be };
}

  async function handleSave() {
    if (!name.trim()) return toast.warn("Informe o nome do profissional");
    if (!hasServices) return toast.warn("Selecione ao menos um serviço");

    // cria profissional
    const { data: prof, error: errProf } = await supabase
      .from("professionals")
      .insert([{ tenant_id: tenantId, name: name.trim(), email: email.trim() || null, phone: phone.trim() || null }])
      .select()
      .single();

    if (errProf) {
      toast.error("Erro ao criar profissional");
      return;
    }

    const professionalId = prof.id;

    // vincula serviços selecionados
    const rowsServices = selectedServices.map((sid) => ({
      tenant_id: tenantId,
      professional_id: professionalId,
      service_id: sid,
    }));

    const { error: errLink } = await supabase
      .from("professional_services")
      .insert(rowsServices);

    if (errLink) {
      toast.error("Erro ao vincular serviços");
      return;
    }

    // monta horários
    let scheduleRows: any[] = [];

if (copyToWeek) {
  const b = validateBreaks(monStart, monEnd, monBreakStart, monBreakEnd);
  if (!b) return; // interrompe se inválido

  scheduleRows.push({
    tenant_id: tenantId,
    professional_id: professionalId,
    weekday: 1,
    start_time: monStart,
    end_time: monEnd,
    break_start_time: b.breakStart || null,
    break_end_time: b.breakEnd || null,
  });

  for (let d = 2; d <= 6; d++) {
    scheduleRows.push({
      tenant_id: tenantId,
      professional_id: professionalId,
      weekday: d,
      start_time: monStart,
      end_time: monEnd,
      break_start_time: b.breakStart || null,
      break_end_time: b.breakEnd || null,
    });
  }
}else {
  for (const r of weekRows) {
    const start = r.start?.trim();
    const end = r.end?.trim();
    if (!start || !end) continue; // dia não trabalhado

    const b = validateBreaks(start, end, r.breakStart?.trim(), r.breakEnd?.trim());
    if (!b) return; // interrompe se inválido

    scheduleRows.push({
      tenant_id: tenantId,
      professional_id: professionalId,
      weekday: r.weekday,
      start_time: padSeconds(start),
      end_time: padSeconds(end),
      break_start_time: b.breakStart, // "00:00:00" se vazio
      break_end_time: b.breakEnd,
    });
  }
}

    if (scheduleRows.length > 0) {
      const { error: errSched } = await supabase
        .from("professional_schedules")
        .insert(scheduleRows);
      if (errSched) {
        toast.error("Erro ao salvar horários");
        return;
      }
    }

    toast.success("Profissional cadastrado!");
    onCreated(professionalId);
    onClose();
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={20} />
        </button>

        <h3>Novo Profissional</h3>

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
        <div className={styles.checkList}>
          {services.length === 0 ? (
            <p style={{ margin: "6px 0" }}>Nenhum serviço cadastrado ainda.</p>
          ) : (
            services.map((s) => (
              <label key={s.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={selectedServices.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                {s.name}
              </label>
            ))
          )}
        </div>

<h4 style={{ marginTop: 12 }}>Horários de trabalho</h4>

<label className={styles.copyWeekRow}>
  <input
    type="checkbox"
    checked={copyToWeek}
    onChange={() => setCopyToWeek((v) => !v)}
  />
  Copiar horários de Segunda para os outros dias (até Sábado)
</label>

{copyToWeek ? (
  <>
    <div className={styles.dayRowTitle}>Segunda-feira</div>

    <div className={styles.timeGrid}>
      <div>
        <label>Entrada</label>
        <input type="time" value={monStart} onChange={(e) => setMonStart(e.target.value)} />
      </div>

      <div>
        <label>Saída</label>
        <input type="time" value={monEnd} onChange={(e) => setMonEnd(e.target.value)} />
      </div>

      <div>
        <label>Almoço início</label>
        <input type="time" value={monBreakStart} onChange={(e) => setMonBreakStart(e.target.value)} />
      </div>

      <div>
        <label>Almoço fim</label>
        <input type="time" value={monBreakEnd} onChange={(e) => setMonBreakEnd(e.target.value)} />
      </div>
    </div>

    <p className={styles.noteText}>
      Domingo ficará sem expediente por padrão. Desmarque a opção acima se quiser configurar por dia.
    </p>
  </>
) : (
  <>
    {WEEKDAYS_FULL.map((d) => (
      <div key={d.id} className={styles.dayBlock}>
        <div className={styles.dayRowTitle}>{d.label}</div>

        <div className={styles.timeGrid}>
          <div>
            <label>Entrada</label>
            <input
              type="time"
              value={weekRows.find((r) => r.weekday === d.id)?.start || ""}
              onChange={(e) => updateRow(d.id, "start", e.target.value)}
            />
          </div>

          <div>
            <label>Saída</label>
            <input
              type="time"
              value={weekRows.find((r) => r.weekday === d.id)?.end || ""}
              onChange={(e) => updateRow(d.id, "end", e.target.value)}
            />
          </div>

          <div>
            <label>Almoço início</label>
            <input
              type="time"
              value={weekRows.find((r) => r.weekday === d.id)?.breakStart || ""}
              onChange={(e) => updateRow(d.id, "breakStart", e.target.value)}
            />
          </div>

          <div>
            <label>Almoço fim</label>
            <input
              type="time"
              value={weekRows.find((r) => r.weekday === d.id)?.breakEnd || ""}
              onChange={(e) => updateRow(d.id, "breakEnd", e.target.value)}
            />
          </div>
        </div>
      </div>
    ))}

    <p className={styles.noteText}>
      Deixe um dia em branco para indicar que <b>não trabalha</b> naquele dia.
    </p>
  </>
)}
        <button className={styles.saveButton} onClick={handleSave} style={{ marginTop: 12 }}>
          Salvar Profissional
        </button>
      </div>
    </div>
  );
}
