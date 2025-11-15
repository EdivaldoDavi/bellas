import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import styles from "../css/ModalCalendar.module.css";

import { useTheme } from "../hooks/useTheme";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate?: string; // "YYYY-MM-DD"
}

export default function ModalCalendar({
  show,
  onClose,
  onSelect,
  selectedDate,
}: Props) {
  const { theme } = useTheme();
  const { tenant } = useUserAndTenant();

  // Primeiro dia do mês atual
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  /** ==========================================================
   * TEMA (AGORA USANDO O TENANT CORRETAMENTE)
   * ========================================================== */
  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }

    if (tenant?.theme_variant) {
      document.documentElement.setAttribute(
        "data-theme-variant",
        tenant.theme_variant
      );
    }
  }, [theme, tenant?.theme_variant]);

  /** ==========================================================
   * NÃO MOSTRA O MODAL SE SHOW = FALSE
   * ========================================================== */
  if (!show) return null;

  /** ==========================================================
   * FUNÇÕES AUXILIARES
   * ========================================================== */

  const year = current.getFullYear();
  const month = current.getMonth(); // 0–11

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const toISOLocal = (yy: number, mm0: number, dd: number) =>
    `${yy}-${pad2(mm0 + 1)}-${pad2(dd)}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Dom .. 6=Sáb

  // Cria estrutura 6 semanas x 7 dias
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length < 42) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < 6; i++) {
    weeks.push(cells.slice(i * 7, i * 7 + 7));
  }

  const today = new Date();
  const todayKey = toISOLocal(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const handleClickDay = (day: number) => {
    const d = new Date(year, month, day);
    onSelect(d);
  };

  const monthNames = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  /** ==========================================================
   * RENDER (PORTAL)
   * ========================================================== */
  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />

        {/* Cabeçalho */}
        <div className={styles.header}>
          <button
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            aria-label="Mês anterior"
          >
            ‹
          </button>

          <span>
            {monthNames[month]} {year}
          </span>

          <button
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>

        {/* Semana */}
        <div className={styles.weekdays}>
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Calendário */}
        <div className={styles.calendar}>
          {weeks.map((week, wi) => (
            <div className={styles.row} key={wi}>
              {week.map((day, di) => {
                if (!day)
                  return (
                    <button key={di} className={styles.dayBtn} disabled />
                  );

                const key = toISOLocal(year, month, day);
                const isToday = key === todayKey;

                // Desabilita datas passadas
                const isPast =
                  new Date(year, month, day).getTime() <
                  new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  ).getTime();

                const isSelected = selectedDate === key;

                return (
                  <button
                    key={di}
                    disabled={isPast}
                    className={[
                      styles.dayBtn,
                      isToday ? styles.today : "",
                      isSelected ? styles.daySelected : "",
                    ].join(" ")}
                    onClick={() => handleClickDay(day)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <button className={styles.closeBtn} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>,
    document.body
  );
}
