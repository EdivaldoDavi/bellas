import { X } from "lucide-react";
import styles from "../css/ModalNewProfessional.module.css";

interface Service {
  id: string;
  name: string;
  duration_min: number | null;
}

interface Props {
  show: boolean;
  services: Service[];
  selectedIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}

export default function ModalSelectServiceForProfessional({
  show,
  services,
  selectedIds,
  onClose,
  onSave,
}: Props) {
  if (!show) return null;

  const allSelected =
    services.length > 0 && selectedIds.length === services.length;

  function toggleId(id: string) {
    if (selectedIds.includes(id)) {
      onSave(selectedIds.filter((x) => x !== id));
    } else {
      onSave([...selectedIds, id]);
    }
  }

  function toggleAll() {
    if (allSelected) {
      onSave([]);
    } else {
      onSave(services.map((s) => s.id));
    }
  }

  function handleConfirm() {
    onSave(selectedIds);
    onClose();
  }

  return (
    <div className={styles.servicesOverlay}>
      <div className={styles.servicesModal}>
        <div className={styles.servicesHeader}>
          <h3>Selecionar serviços</h3>

          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.servicesList}>
          {/* SELECT ALL */}
          <label
            className={styles.selectAllRow}
            onClick={toggleAll}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              onClick={(e) => e.stopPropagation()}
            />
            <span className={styles.selectAllLabel}>Selecionar todos</span>
          </label>

          {/* SERVIÇOS */}
          <div className={styles.servicesGrid}>
            {services.map((s) => (
              <label
                key={s.id}
                className={styles.serviceItem}
                onClick={() => toggleId(s.id)}
              >
                {/* ORDEM IMPORTANTE: checkbox → nome → duração */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleId(s.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                <span className={styles.serviceName}>{s.name}</span>

                {typeof s.duration_min === "number" && (
                  <span className={styles.serviceDuration}>
                    {s.duration_min} min
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.servicesFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.saveBtn} onClick={handleConfirm}>
            Salvar seleção
          </button>
        </div>
      </div>
    </div>
  );
}
