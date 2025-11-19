import { useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "../css/ModalSelectScheduleForProfessional.module.css";

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

interface Props {
  show: boolean;
  weekRows: DayRow[];
  copyToWeek: boolean;
  onClose: () => void;
  onSave: (rows: DayRow[], copyFlag: boolean) => void;
}

/* Garantir semana completa */
function ensureFullWeek(rows: DayRow[]): DayRow[] {
  return WEEKDAYS.map((d) => {
    return (
      rows.find((x) => x.weekday === d.id) || {
        weekday: d.id,
        start: "",
        end: "",
        breakStart: "",
        breakEnd: "",
      }
    );
  });
}

export default function ModalSelectScheduleForProfessional({
  show,
  weekRows,
  copyToWeek,
  onClose,
  onSave,
}: Props) {
  if (!show) return null;

  const [localCopy, setLocalCopy] = useState(copyToWeek);
  const [localWeek, setLocalWeek] = useState<DayRow[]>(ensureFullWeek(weekRows));

  useEffect(() => {
    if (show) {
      setLocalCopy(copyToWeek);
      setLocalWeek(ensureFullWeek(weekRows));
    }
  }, [show, copyToWeek, weekRows]);

  function updateRow(id: number, field: keyof DayRow, value: string) {
    setLocalWeek((prev) =>
      prev.map((row) =>
        row.weekday === id ? { ...row, [field]: value } : row
      )
    );
  }

  function save() {
    let finalRows = [...localWeek];

    // copiar segunda → recriar todos os outros dias
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

    onSave(finalRows, localCopy);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Definir horários</h3>

          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* COPIAR SEGUNDA */}
        <label className={styles.item} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={localCopy}
            onChange={() => setLocalCopy((v) => !v)}
          />
          <span>Copiar segunda para todos os dias</span>
        </label>

        {/* BLOCO */}
        {localCopy ? (
          <div className={styles.block}>
            <div className={styles.dayTitle}>Segunda-feira</div>

            <div className={styles.grid}>
              <div>
                <label>Entrada</label>
                <input
                  type="time"
                  value={localWeek[0]?.start || ""}
                  onChange={(e) => updateRow(1, "start", e.target.value)}
                />
              </div>

              <div>
                <label>Saída</label>
                <input
                  type="time"
                  value={localWeek[0]?.end || ""}
                  onChange={(e) => updateRow(1, "end", e.target.value)}
                />
              </div>

              <div>
                <label>Almoço início</label>
                <input
                  type="time"
                  value={localWeek[0]?.breakStart || ""}
                  onChange={(e) => updateRow(1, "breakStart", e.target.value)}
                />
              </div>

              <div>
                <label>Almoço fim</label>
                <input
                  type="time"
                  value={localWeek[0]?.breakEnd || ""}
                  onChange={(e) => updateRow(1, "breakEnd", e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          WEEKDAYS.map((d, idx) => {
            const r = localWeek[idx]; // sempre existe agora

            return (
              <div key={d.id} className={styles.block}>
                <div className={styles.dayTitle}>{d.label}</div>

                <div className={styles.grid}>
                  <div>
                    <label>Entrada</label>
                    <input
                      type="time"
                      value={r.start}
                      onChange={(e) => updateRow(d.id, "start", e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Saída</label>
                    <input
                      type="time"
                      value={r.end}
                      onChange={(e) => updateRow(d.id, "end", e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Almoço início</label>
                    <input
                      type="time"
                      value={r.breakStart}
                      onChange={(e) =>
                        updateRow(d.id, "breakStart", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label>Almoço fim</label>
                    <input
                      type="time"
                      value={r.breakEnd}
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

        {/* FOOTER */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>

          <button className={styles.saveBtn} onClick={save}>
            Salvar horários
          </button>
        </div>
      </div>
    </div>
  );
}
