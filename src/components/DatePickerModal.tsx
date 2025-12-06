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
import LoadingSpinner from "./LoadingSpinner";

interface Props {
  tenantId: string;
  professionalId: string;
  serviceDuration: number;
  value?: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
}

/* ============================================================
   CONFIGURAÇÃO DA SEMANA (Brasil)
   1 = Segunda (PT-BR)
============================================================ */
const WEEK_STARTS_ON = 1; // segunda-feira

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* 
    Se semana começa na segunda, reorganiza:
    Dom → vai para o final
*/
const HEADER_LABELS =
  WEEK_STARTS_ON === 1
    ? ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    : WEEK_LABELS;

/* ============================================================
   CONVERSÃO DO getDay()
   getDay() → 0 = Domingo, 1 = Segunda...
   Queremos 0 = Segunda, 6 = Domingo
============================================================ */
function startIndexForMonth(firstDayGetDay: number) {
  if (WEEK_STARTS_ON === 1) {
    return (firstDayGetDay + 6) % 7;
  }
  return firstDayGetDay;
}

/* ============================================================
   COMPONENTE
============================================================ */
export default function DatePickerModal({
  professionalId,
  serviceDuration,
  value,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);

  // mês inicial baseado no value ou no mês atual
  const initialDate = value ? new Date(value) : new Date();

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() + 1); // 1..12

  // Carrega disponibilidade via hook customizado
  const { loading, available } = useAvailableDays(
    professionalId,
    serviceDuration,
    viewYear,
    viewMonth
  );

  /* ============================================================
     GERAÇÃO DA MATRIZ DE DIAS
  ============================================================ */
  const matrix = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const last = new Date(viewYear, viewMonth, 0);

    const daysInMonth = last.getDate();
    const startOffset = startIndexForMonth(first.getDay());

    const cells: { iso?: string; day?: number }[] = [];

    // preenche vazios antes do dia 1
    for (let i = 0; i < startOffset; i++) cells.push({});

    // preenche dias reais
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      cells.push({ iso, day: d });
    }

    // completa para múltiplo de 7
    while (cells.length % 7 !== 0) cells.push({});

    return cells;
  }, [viewYear, viewMonth]);

  /* ============================================================
     NAVEGAÇÃO
  ============================================================ */
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

  /* ============================================================
     SELEÇÃO DE DATA
  ============================================================ */
  function confirmPick(iso?: string) {
    if (!iso) return;

    if (!available.has(iso)) {
      toast.warn("Nenhum horário disponível nesta data.");
      return;
    }

    if (isInvalidAppointmentDate(iso)) {
      toast.warn("Data indisponível para agendamento.");
      return;
    }

    onSelect(iso);
    setOpen(false);
  }

  /* ============================================================
     RENDERIZAÇÃO
  ============================================================ */
  return (
    <>
      {/* Input que abre o modal */}
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

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Cabeçalho - mês atual */}
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

            {/* Legenda */}
            <div className={styles.legend}>
              <span className={styles.badgeOk} /> Disponível
              <span className={styles.badgeNo} /> Indisponível
            </div>

            {/* Calendário */}
            <div className={styles.grid}>
              {HEADER_LABELS.map((w) => (
                <div key={w} className={`${styles.cell} ${styles.headerCell}`}>
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

            {loading && <LoadingSpinner />}

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