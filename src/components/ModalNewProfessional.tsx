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
  onSuccess?: (id: string, name: string) => void;
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

export default function ModalNewProfessional({
  tenantId,
  show,
  mode = "agenda",
  onClose,
  onSuccess,
}: ModalNewProfessionalProps) {
  // ================= STATE =================
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

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

  // ================= RESET AO ABRIR =================
  useEffect(() => {
    if (!show) return;

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
  }, [show]);

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
      // 1️⃣ Cadastrar profissional
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

      if (profErr) {
        console.error("Erro ao cadastrar profissional:", profErr);
        toast.error("Erro ao cadastrar profissional");
        setSaving(false);
        return;
      }

      const professionalId = prof.id as string;

      // 2️⃣ Vincular serviços
      const serviceRows = selectedServices.map((sid) => ({
        tenant_id: tenantId,
        professional_id: professionalId,
        service_id: sid,
      }));

      if (serviceRows.length > 0) {
        const { error: linkErr } = await supabase
          .from("professional_services")
          .insert(serviceRows);

        if (linkErr) {
          console.error("Erro ao vincular serviços:", linkErr);
          toast.error("Profissional criado, mas houve erro ao vincular serviços.");
        }
      }

      // 3️⃣ Montar horários
      const scheduleRows: any[] = [];

      if (copyToWeek) {
        const ws = padSeconds(monStart);
        const we = padSeconds(monEnd);
        const bs = padSeconds(monBreakStart);
        const be = padSeconds(monBreakEnd);

        // Segunda (1) até Sábado (6)
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
        weekRows.forEach((r) => {
          if (!r.start || !r.end) return;
          scheduleRows.push({
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

      if (scheduleRows.length > 0) {
        const { error: schedErr } = await supabase
          .from("professional_schedules")
          .insert(scheduleRows);

        if (schedErr) {
          console.error("Erro ao salvar horários:", schedErr);
          toast.error("Profissional criado, mas houve erro ao salvar horários.");
        }
      }

      toast.success("Profissional cadastrado!");

      // ========== COMPORTAMENTO POR MODE ==========
      if (mode === "agenda") {
        onSuccess?.(professionalId, name.trim());
        onClose();
      } else {
        // "cadastro" → limpa para seguir cadastrando
        setName("");
        setEmail("");
        setPhone("");
        setSelectedServices([]);
        setWeekRows(emptyWeekRows);
        toast.success("Pronto! Pode cadastrar outro profissional.");
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
                      onChange={(e) => updateRow(d.id, "start", e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Saída</label>
                    <input
                      type="time"
                      value={row.end}
                      onChange={(e) => updateRow(d.id, "end", e.target.value)}
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
          {saving ? "Salvando..." : "Salvar Profissional"}
        </button>
      </div>
    </div>
  );
}
