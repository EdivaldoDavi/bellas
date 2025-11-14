import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import styles from "../css/ModalNewProfessional.module.css";

interface ModalNewProfessionalProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (id: string, name: string) => void; // ✅ agora retorna id + nome
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
  if (!t) return "";
  return t.length === 5 ? `${t}:00` : t;
}



export default function ModalNewProfessional({
  tenantId,
  onClose,
  onCreated
}: ModalNewProfessionalProps) {
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const hasServices = useMemo(() => selectedServices.length > 0, [selectedServices]);

  const [copyToWeek, setCopyToWeek] = useState(true);
  const [monStart, setMonStart] = useState("09:00");
  const [monEnd, setMonEnd] = useState("18:00");
  const [monBreakStart, setMonBreakStart] = useState("00:00");
  const [monBreakEnd, setMonBreakEnd] = useState("00:00");

  const [weekRows, setWeekRows] = useState<DayRow[]>(
    WEEKDAYS_FULL.map((d) => ({
      weekday: d.id,
      start: "",
      end: "",
      breakStart: "",
      breakEnd: "",
    }))
  );

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,duration_min")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) toast.error("Erro ao carregar serviços");
      setServices(data || []);
    })();
  }, [tenantId]);

  function toggleService(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function updateRow(weekday: number, field: keyof Omit<DayRow, "weekday">, value: string) {
    setWeekRows(prev =>
      prev.map(r => (r.weekday === weekday ? { ...r, [field]: value } : r))
    );
  }

  async function handleSave() {
    if (!name.trim()) return toast.warn("Informe o nome do profissional");
    if (!hasServices) return toast.warn("Selecione ao menos um serviço");

    const { data: prof, error: errProf } = await supabase
      .from("professionals")
      .insert([{ tenant_id: tenantId, name, email: email || null, phone: phone || null }])
      .select()
      .single();

    if (errProf) return toast.error("Erro ao criar profissional");
    
    const professionalId = prof.id;

    await supabase.from("professional_services").insert(
      selectedServices.map((sid) => ({
        tenant_id: tenantId,
        professional_id: professionalId,
        service_id: sid,
      }))
    );

    let scheduleRows: any[] = [];

    if (copyToWeek) {
      const ws = padSeconds(monStart);
      const we = padSeconds(monEnd);
      const bs = padSeconds(monBreakStart);
      const be = padSeconds(monBreakEnd);

      for (let d = 1; d <= 6; d++) {
        scheduleRows.push({
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
      for (const r of weekRows) {
        if (!r.start || !r.end) continue;
        scheduleRows.push({
          tenant_id: tenantId,
          professional_id: professionalId,
          weekday: r.weekday,
          start_time: padSeconds(r.start),
          end_time: padSeconds(r.end),
          break_start_time: padSeconds(r.breakStart),
          break_end_time: padSeconds(r.breakEnd),
        });
      }
    }

    if (scheduleRows.length > 0) {
      await supabase.from("professional_schedules").insert(scheduleRows);
    }

    toast.success("Profissional cadastrado!");

    // ✅ retorna id + nome para o wizard selecionar automaticamente
    onCreated(professionalId, name);
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
        <button onClick={onClose} className={styles.closeBtn}> <X size={20} /> </button>

        <h3>Novo Profissional</h3>

        <input className={styles.input} placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} />
        <input className={styles.input} placeholder="E-mail (opcional)" value={email} onChange={e => setEmail(e.target.value)} />
        <input className={styles.input} placeholder="Telefone (opcional)" value={phone} onChange={e => setPhone(e.target.value)} />

        <h4>Serviços que executa</h4>
        <div className={styles.checkList}>
          {services.map(s => (
            <label key={s.id} className={styles.checkItem}>
              <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleService(s.id)} />
              {s.name}
            </label>
          ))}
        </div>

        <h4>Horários de trabalho</h4>

        <label className={styles.copyRow}>
          <input type="checkbox" checked={copyToWeek} onChange={() => setCopyToWeek(!copyToWeek)} />
          Copiar segunda para os outros dias (até sábado)
        </label>

        {copyToWeek ? (
          <>
            <div className={styles.dayTitle}>Segunda-feira</div>
            <div className={styles.timeGrid}>
              <div><label>Entrada</label><input type="time" value={monStart} onChange={e => setMonStart(e.target.value)} /></div>
              <div><label>Saída</label><input type="time" value={monEnd} onChange={e => setMonEnd(e.target.value)} /></div>
              <div><label>Almoço início</label><input type="time" value={monBreakStart} onChange={e => setMonBreakStart(e.target.value)} /></div>
              <div><label>Almoço fim</label><input type="time" value={monBreakEnd} onChange={e => setMonBreakEnd(e.target.value)} /></div>
            </div>
          </>
        ) : (
          WEEKDAYS_FULL.map(d => (
            <div key={d.id} className={styles.dayBlock}>
              <div className={styles.dayTitle}>{d.label}</div>
              <div className={styles.timeGrid}>
                <div><label>Entrada</label><input type="time" value={weekRows.find(r => r.weekday === d.id)?.start || ""} onChange={e => updateRow(d.id, "start", e.target.value)} /></div>
                <div><label>Saída</label><input type="time" value={weekRows.find(r => r.weekday === d.id)?.end || ""} onChange={e => updateRow(d.id, "end", e.target.value)} /></div>
                <div><label>Almoço início</label><input type="time" value={weekRows.find(r => r.weekday === d.id)?.breakStart || ""} onChange={e => updateRow(d.id, "breakStart", e.target.value)} /></div>
                <div><label>Almoço fim</label><input type="time" value={weekRows.find(r => r.weekday === d.id)?.breakEnd || ""} onChange={e => updateRow(d.id, "breakEnd", e.target.value)} /></div>
              </div>
            </div>
          ))
        )}

        <button className={styles.saveBtn} onClick={handleSave}>
          Salvar Profissional
        </button>
      </div>
    </div>
  );
}
