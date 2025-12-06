import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";

import { supabase } from "../../lib/supabaseCleint";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import styles from "../../css/ModalSelectScheduleForProfessional.module.css";

interface DayRow {
  weekday: number;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

const WEEKDAYS = [
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
  { id: 7, label: "Domingo" },
];

function ensureFullWeek(rows: DayRow[]): DayRow[] {
  return WEEKDAYS.map((d) => {
    const found = rows.find((x) => x.weekday === d.id);
    return (
      found || {
        weekday: d.id,
        start: "",
        end: "",
        breakStart: "",
        breakEnd: "",
      }
    );
  });
}

function stripSeconds(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function padSeconds(t: string) {
  if (!t) return "";
  return t.length === 5 ? `${t}:00` : t;
}

export default function ProfessionalSchedulePage() {
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;
  const { id: professionalId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const returnTo = searchParams.get("returnTo") || (professionalId ? `/profissionais/edit/${professionalId}` : "/profissionais");

  const [localCopy, setLocalCopy] = useState(true);
  const [localWeek, setLocalWeek] = useState<DayRow[]>(ensureFullWeek([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !professionalId) return;

    (async () => {
      setLoading(true);

      const { data: scheds, error } = await supabase
        .from("professional_schedules")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (error) {
        toast.error("Erro ao carregar horários");
        setLocalWeek(ensureFullWeek([]));
        setLocalCopy(true);
      } else {
        const rows = ensureFullWeek(
          (scheds || []).map((s: any) => ({
            weekday: s.weekday,
            start: stripSeconds(s.start_time),
            end: stripSeconds(s.end_time),
            breakStart: stripSeconds(s.break_start_time),
            breakEnd: stripSeconds(s.break_end_time),
          }))
        );
        setLocalWeek(rows);
        setLocalCopy(false);
      }

      setLoading(false);
    })();
  }, [tenantId, professionalId]);

  function updateRow(id: number, field: keyof DayRow, value: string) {
    setLocalWeek((prev) => prev.map((row) => (row.weekday === id ? { ...row, [field]: value } : row)));
  }

  async function save() {
    if (!tenantId || !professionalId) return;

    let finalRows = [...localWeek];

    if (localCopy) {
      const base = localWeek[0];
      finalRows = WEEKDAYS.map((d) => ({
        weekday: d.id,
        start: base.start,
        end: base.end,
        breakStart: base.breakStart,
        breakEnd: base.breakEnd,
      }));
    }

    await supabase
      .from("professional_schedules")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("professional_id", professionalId);

    const rowsToInsert = finalRows
      .filter((w) => w.start && w.end)
      .map((w) => ({
        tenant_id: tenantId,
        professional_id: professionalId,
        weekday: w.weekday,
        start_time: padSeconds(w.start),
        end_time: padSeconds(w.end),
        break_start_time: padSeconds(w.breakStart || "00:00"),
        break_end_time: padSeconds(w.breakEnd || "00:00"),
      }));

    if (rowsToInsert.length > 0) {
      await supabase.from("professional_schedules").insert(rowsToInsert);
    }

    toast.success("Horários atualizados!");
    const url = new URL(window.location.origin + returnTo);
    url.searchParams.set("refreshProfessional", "1");
    navigate(url.pathname + url.search, { replace: true });
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Definir horários</h3>
          <button className={styles.closeBtn} onClick={() => navigate(returnTo)}>
            <X size={18} />
          </button>
        </div>

        <label className={styles.item}>
          <input type="checkbox" checked={localCopy} onChange={() => setLocalCopy((v) => !v)} />
          <span>Copiar segunda para todos os dias</span>
          <span className={styles.duration}></span>
        </label>

        {loading ? (
          <div className={styles.list}>
            <LoadingSpinner />
          </div>
        ) : localCopy ? (
          <div className={styles.block}>
            <div className={styles.dayTitle}>Segunda-feira</div>
            <div className={styles.grid}>
              <div>
                <label>Entrada</label>
                <input type="time" value={localWeek[0]?.start || ""} onChange={(e) => updateRow(1, "start", e.target.value)} />
              </div>
              <div>
                <label>Saída</label>
                <input type="time" value={localWeek[0]?.end || ""} onChange={(e) => updateRow(1, "end", e.target.value)} />
              </div>
              <div>
                <label>Almoço início</label>
                <input type="time" value={localWeek[0]?.breakStart || ""} onChange={(e) => updateRow(1, "breakStart", e.target.value)} />
              </div>
              <div>
                <label>Almoço fim</label>
                <input type="time" value={localWeek[0]?.breakEnd || ""} onChange={(e) => updateRow(1, "breakEnd", e.target.value)} />
              </div>
            </div>
          </div>
        ) : (
          WEEKDAYS.map((d, idx) => {
            const r = localWeek[idx];
            return (
              <div key={d.id} className={styles.block}>
                <div className={styles.dayTitle}>{d.label}</div>
                <div className={styles.grid}>
                  <div>
                    <label>Entrada</label>
                    <input type="time" value={r.start} onChange={(e) => updateRow(d.id, "start", e.target.value)} />
                  </div>
                  <div>
                    <label>Saída</label>
                    <input type="time" value={r.end} onChange={(e) => updateRow(d.id, "end", e.target.value)} />
                  </div>
                  <div>
                    <label>Almoço início</label>
                    <input type="time" value={r.breakStart} onChange={(e) => updateRow(d.id, "breakStart", e.target.value)} />
                  </div>
                  <div>
                    <label>Almoço fim</label>
                    <input type="time" value={r.breakEnd} onChange={(e) => updateRow(d.id, "breakEnd", e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={() => navigate(returnTo)}>Cancelar</button>
          <button className={styles.saveBtn} onClick={save}>Salvar horários</button>
        </div>
      </div>
    </div>
  );
}