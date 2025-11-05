import { X } from "lucide-react";
import styles from "../css/Agenda.module.css";

interface Props {
  show: boolean;
  services: Array<{ id: string; name: string; duration_min: number }>;
  onClose: () => void;
  onSelect: (id: string, name: string, duration: number) => void;
}

export default function ModalSelectServiceForProfessional({
  show,
  services,
  onClose,
  onSelect,
}: Props) {
  if (!show) return null;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>

        <button className={styles.closeBtn} onClick={onClose}>
          <X />
        </button>

        <h3>Selecione o Serviço</h3>

        <div className={styles.listServicesModal}>
          {services.map((s) => (
            <button
              key={s.id}
              className={styles.serviceOption}
              onClick={() => onSelect(s.id, s.name, s.duration_min)}
            >
              <div>
                <strong>{s.name}</strong>
              </div>
              <span>⏱ {s.duration_min} min</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
