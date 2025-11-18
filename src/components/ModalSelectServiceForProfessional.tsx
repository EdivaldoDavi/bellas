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

  const toggleId = (id: string) => {
    const newList = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];

    onSave(newList);
  };

  const toggleAll = () => {
    onSave(allSelected ? [] : services.map((s) => s.id));
  };

  return (
    <div
      className={styles.servicesOverlay}
      onClick={(e) => {
        e.stopPropagation(); // NÃO deixa subir para o modal principal
        onClose();
      }}
    >
      <div
        className={styles.servicesModal}
        onClick={(e) => e.stopPropagation()} // impede fechar ao clicar dentro
      >
        <div className={styles.servicesHeader}>
          <h3>Selecionar serviços</h3>

          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.servicesList}>
          <label
            className={styles.serviceItem}
            onClick={() => toggleAll()}
          >
            <input
              type="checkbox"
              checked={allSelected}
              readOnly
              onClick={(e) => {
                e.stopPropagation();
                toggleAll();
              }}
            />

            <span className={styles.serviceName}>Selecionar todos</span>
            <span className={styles.serviceDuration}></span>
          </label>

          <div className={styles.servicesGrid}>
            {services.map((s) => (
              <label
                key={s.id}
                className={styles.serviceItem}
                onClick={() => toggleId(s.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  readOnly
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleId(s.id);
                  }}
                />

                <span className={styles.serviceName}>{s.name}</span>

                <span className={styles.serviceDuration}>
                  {s.duration_min ? `${s.duration_min} min` : ""}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.servicesFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>

          <button className={styles.saveBtn} onClick={onClose}>
            Salvar seleção
          </button>
        </div>
      </div>
    </div>
  );
}
