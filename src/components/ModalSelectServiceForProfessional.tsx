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

  /* --------------------------------------
     Selecionar / remover 1 serviço
  --------------------------------------- */
  function toggleId(id: string) {
    const newList = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];

    onSave(newList);
  }

  /* --------------------------------------
     Selecionar / remover todos
  --------------------------------------- */
  function toggleAll() {
    if (allSelected) {
      onSave([]);
    } else {
      onSave(services.map((s) => s.id));
    }
  }

  /* --------------------------------------
     Confirmar
  --------------------------------------- */
  function handleConfirm() {
    onSave(selectedIds);
    onClose();
  }

  /* ======================================
       RENDER
  ======================================= */

  return (
    <div className={styles.servicesOverlay}>
      <div className={styles.servicesModal} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className={styles.servicesHeader}>
          <h3>Selecionar serviços</h3>

          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* LISTA */}
        <div className={styles.servicesList}>

          {/* SELECT ALL */}
          <label
            className={styles.serviceItem}
            onClick={(e) => {
              e.stopPropagation();
              toggleAll();
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              onClick={(e) => e.stopPropagation()}
            />
            <span className={styles.serviceName}>Selecionar todos</span>
            <span className={styles.serviceDuration}></span>
          </label>

          {/* SERVIÇOS */}
          <div className={styles.servicesGrid}>
            {services.map((s) => (
              <label
                key={s.id}
                className={styles.serviceItem}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleId(s.id);
                }}
              >
                {/* CHECK */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleId(s.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* NOME */}
                <span className={styles.serviceName}>{s.name}</span>

                {/* DURAÇÃO */}
                <span className={styles.serviceDuration}>
                  {s.duration_min ? `${s.duration_min} min` : ""}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* FOOTER */}
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
