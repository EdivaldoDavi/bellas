import { useEffect, useState } from "react";
import styles from "../css/ModalScheduleTimes.module.css";

interface ModalScheduleTimesProps {
  show: boolean;
  times: string[];
  onClose: () => void;
  onSelect: (time: string) => void;
}

export default function ModalScheduleTimes({
  show,
  times,
  onClose,
  onSelect
}: ModalScheduleTimesProps) {

  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Reset sempre que abrir
  useEffect(() => {
    if (show) setSelectedTime(null);
  }, [show]);

  if (!show) return null;

  function handleTimePick(time: string) {
    setSelectedTime(time);

    // Delay suave para permitir animação visual
    setTimeout(() => {
      onSelect(time);
      onClose();
    }, 120);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <div className={styles.handle}></div>
        <div className={styles.title}>Horários disponíveis</div>

        <div className={styles.timesGrid}>
          {times.length === 0 && (
            <p className={styles.noTimes}>Nenhum horário disponível</p>
          )}

          {times.map((t) => {
            const active = selectedTime === t;

            return (
<button
  key={t}
  type="button"
  className={styles.timeBtn}
  data-selected={t === selectedTime ? "true" : "false"}
  onMouseDown={() => setSelectedTime(t)}     // Desktop
  onTouchStart={() => setSelectedTime(t)}    // Mobile
  onClick={() => {
    onSelect(t);
    onClose();
  }}
>
  {t}
</button>            );
          })}
        </div>

        <button className={styles.closeBtn} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
