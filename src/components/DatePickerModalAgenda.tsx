import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "../css/DatePickerModal.module.css";
import { dateBR, toLocalISOString } from "../utils/date";
import { useAvailableDays } from "../hooks/useAvailableDays";

interface Props {
  value: string;
  onSelect: (date: string) => void;
  professionalId?: string;
  serviceDuration?: number;
}

/** ✅ Semana começa no DOMINGO */
const WEEK_STARTS_ON: number = 0;
const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HEADER_LABELS =
  WEEK_STARTS_ON === 1
    ? [...WEEK_LABELS.slice(1), WEEK_LABELS[0]] // segunda a domingo
    : WEEK_LABELS; // domingo a sábado

/** Calcula o deslocamento da primeira coluna conforme o início da semana */
function startIndexForMonth(firstDayGetDay: number) {
  return WEEK_STARTS_ON === 1 ? (firstDayGetDay + 6) % 7 : firstDayGetDay;
}

/**
 * 📅 DatePickerModalAgenda
 * Componente de calendário inline reutilizando o estilo do DatePickerModal,
 * com controle interno de navegação entre meses.
 */
export default function DatePickerModalAgenda({
  value,
  onSelect,
  professionalId,
  serviceDuration,
}: Props) {
  // Estado do mês/ano em exibição
  const [viewYear, setViewYear] = useState(() =>
    value ? new Date(value).getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    value ? new Date(value).getMonth() + 1 : new Date().getMonth() + 1
  );

  // Função para navegar entre meses
  const changeMonth = (delta: number) => {
    const newDate = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(newDate.getFullYear());
    setViewMonth(newDate.getMonth() + 1);
  };

  /** Se não tiver professionalId e serviceDuration, habilita todos os dias */
  const enableAllDays = !professionalId || !serviceDuration;

  /** Hook de disponibilidade (apenas se ambos existirem) */
  const { loading, available } = useAvailableDays(
    professionalId ?? "",
    serviceDuration ?? 0,
    viewYear,
    viewMonth
  );

  /** Monta a grade de dias do mês */
  const matrix = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const last = new Date(viewYear, viewMonth, 0);
    const daysInMonth = last.getDate();

    const startOffset = startIndexForMonth(first.getDay());
    const cells: { iso?: string; day?: number }[] = [];

    // espaços antes do primeiro dia
    for (let i = 0; i < startOffset; i++) cells.push({});
    // dias do mês
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

  /** Verifica se o dia está habilitado */
  const isDayEnabled = (iso?: string) =>
    !!iso && (enableAllDays ? true : available.has(iso));

  return (
    <div className={styles.modalInline}>
      {/* Cabeçalho com mês e ano */}
      <div className={styles.header}>
        <button
          className={styles.navBtn}
          onClick={() => changeMonth(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <h3>
          {new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </h3>

        <button
          className={styles.navBtn}
          onClick={() => changeMonth(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Legenda (somente se houver controle de disponibilidade) */}
      {!enableAllDays && (
        <div className={styles.legend}>
          <span className={styles.badgeOk} /> Disponível
          <span className={styles.badgeNo} /> Indisponível
        </div>
      )}

      {/* Grade do calendário */}
      <div className={styles.grid}>
        {HEADER_LABELS.map((w) => (
          <div key={w} className={`${styles.cell} ${styles.headerCell}`}>
            {w}
          </div>
        ))}

        {matrix.map((c, i) => {
          const iso = c.iso;
          const enabled = isDayEnabled(iso);
          const isToday =
            iso && iso === toLocalISOString(new Date()).split("T")[0];
          const isSelected = iso === value;

          return (
            <button
              key={i}
              disabled={!enabled}
              onClick={() => enabled && onSelect(iso!)}
              className={`${styles.cell} 
                ${enabled ? styles.cellOk : styles.cellNo} 
                ${isToday ? styles.today : ""} 
                ${isSelected ? styles.cellSelected : ""}`}
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
        {value ? `Selecionado: ${dateBR(value)}` : "Selecione um dia"}
      </div>
    </div>
  );
}
