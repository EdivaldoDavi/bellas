import {  useMemo, useState } from "react";
import styles from "../css/ModalCalendar.module.css";

interface Props {
  /** Data selecionada no formato YYYY-MM-DD */
  value?: string;
  /** Callback quando o usuário escolhe uma data (YYYY-MM-DD) */
  onSelect: (dateIso: string) => void;
}

export default function DatePickerModalAgenda({ value, onSelect }: Props) {
  // Estado do mês atual (primeiro dia do mês)
  const [current, setCurrent] = useState(() => {
    const d = value ? parseISO(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = current.getFullYear();
  const month = current.getMonth(); // 0–11

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const toISOLocal = (yy: number, mm0: number, dd: number) =>
    `${yy}-${pad2(mm0 + 1)}-${pad2(dd)}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Dom .. 6=Sáb

  const cells: (number | null)[] = useMemo(() => {
    const arr: (number | null)[] = [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (arr.length < 42) arr.push(null);
    return arr;
  }, [firstWeekday, daysInMonth]);

  const weeks = useMemo(() => {
    const w: (number | null)[][] = [];
    for (let i = 0; i < 6; i++) {
      w.push(cells.slice(i * 7, i * 7 + 7));
    }
    return w;
  }, [cells]);

  const today = new Date();
  const todayKey = toISOLocal(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  function parseISO(iso: string): Date {
    const [yy, mm, dd] = iso.split("-").map((x) => parseInt(x, 10));
    return new Date(yy, (mm || 1) - 1, dd || 1);
  }

  const selectedDate = value || "";

  const handleClickDay = (day: number) => {
    const iso = toISOLocal(year, month, day);
    onSelect(iso);
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

  return (
    <div>
      {/* Cabeçalho do calendário */}
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

      {/* Grade de dias */}
      <div className={styles.calendar}>
        {weeks.map((week, wi) => (
          <div className={styles.row} key={wi}>
            {week.map((day, di) => {
              if (!day)
                return <button key={di} className={styles.dayBtn} disabled />;

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
    </div>
  );
}