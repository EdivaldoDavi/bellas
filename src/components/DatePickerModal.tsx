import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import styles from "../css/DatePickerModal.module.css";
import {
  isInvalidAppointmentDate,
  dateBR,
  toLocalISOString,
} from "../utils/date";
import { useAvailableDays } from "../hooks/useAvailableDays";

interface Props {
  professionalId: string;
  serviceDuration: number;
  value?: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
}

/** Configuração da semana: 1 = segunda, 0 = domingo */
const WEEK_STARTS_ON = 1; // ✅ começa na segunda-feira (Brasil)
const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HEADER_LABELS =
  WEEK_STARTS_ON === 1
    ? [...WEEK_LABELS.slice(0), WEEK_LABELS[0]] // ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]
    : WEEK_LABELS;

/** Converte getDay() (0=Dom..6=Sáb) para índice de coluna considerando início da semana */
function startIndexForMonth(firstDayGetDay: number) {
  return WEEK_STARTS_ON === 1 ? (firstDayGetDay + 6) % 7 : firstDayGetDay;
}

export default function DatePickerModal({
  professionalId,
  serviceDuration,
  value,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);

  // estado do mês exibido
  const start = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(start.getFullYear());
  const [viewMonth, setViewMonth] = useState(start.getMonth() + 1); // 1..12

  // hook que calcula dias com horários disponíveis
  const { loading, available } = useAvailableDays(
    professionalId,
    serviceDuration,
    viewYear,
    viewMonth
  );

  // matriz de dias do calendário
  const matrix = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const last = new Date(viewYear, viewMonth, 0);
    const daysInMonth = last.getDate();

    const startOffset = startIndexForMonth(first.getDay());
    const cells: { iso?: string; day?: number }[] = [];

    // posições vazias antes do dia 1
    for (let i = 0; i < startOffset; i++) cells.push({});

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      cells.push({ iso, day: d });
    }

    // completa até múltiplo de 7
    while (cells.length % 7 !== 0) cells.push({});
    return cells;
  }, [viewYear, viewMonth]);

  // navegação entre meses
  function prevMonth() {
    const dt = new Date(viewYear, viewMonth - 2, 1);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth() + 1);
  }
  function nextMonth() {
    const dt = new Date(viewYear, viewMonth, 1);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth() + 1);
  }

  // seleção da data
  async function confirmPick(iso?: string) {
    if (!iso) return;

    // 🔒 bloqueia datas não disponíveis
    if (!available.has(iso)) {
      toast.warn(
        "Não há horários disponíveis para este profissional nesta data."
      );
      return;
    }

    // 🔒 bloqueia datas inválidas (feriado, passado, domingo)
    if (isInvalidAppointmentDate(iso)) {
      toast.warn("Data indisponível para agendamento.");
      return;
    }

    onSelect(iso);
    setOpen(false);
  }

  return (
    <>
      {/* Campo com ícone que abre o modal */}
      <div className={styles.inputWrapper} onClick={() => setOpen(true)}>
        <input
          type="text"
          className={styles.input}
          readOnly
          value={value ? value.split("-").reverse().join("/") : ""}
          placeholder="dd/mm/aaaa"
        />
        <CalendarDays className={styles.icon} size={20} />
      </div>

      {/* Modal do calendário */}
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <button className={styles.navBtn} onClick={prevMonth}>
                <ChevronLeft size={18} />
              </button>

              <h3>
                {new Date(viewYear, viewMonth - 1, 1).toLocaleDateString(
                  "pt-BR",
                  { month: "long", year: "numeric" }
                )}
              </h3>

              <button className={styles.navBtn} onClick={nextMonth}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* legenda */}
            <div className={styles.legend}>
              <span className={styles.badgeOk} /> Disponível
              <span className={styles.badgeNo} /> Indisponível
            </div>

            {/* grade do calendário */}
            <div className={styles.grid}>
              {HEADER_LABELS.map((w) => (
                <div
                  key={w}
                  className={`${styles.cell} ${styles.headerCell}`}
                >
                  {w}
                </div>
              ))}

              {matrix.map((c, i) => {
                const iso = c.iso;
                const isAvailable = iso && available.has(iso);
                const isToday =
                  iso &&
                  iso === toLocalISOString(new Date()).split("T")[0];

                return (
                  <button
                    key={i}
                    disabled={!isAvailable}
                    onClick={() => isAvailable && confirmPick(iso)}
                    className={`${styles.cell} 
                      ${isAvailable ? styles.cellOk : styles.cellNo} 
                      ${isToday ? styles.today : ""}`}
                  >
                    {c.day ?? ""}
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className={styles.loading}>Carregando disponibilidade...</div>
            )}

            <div className={styles.footerHint}>
              {value
                ? `Selecionado: ${dateBR(value)}`
                : "Selecione um dia disponível"}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
