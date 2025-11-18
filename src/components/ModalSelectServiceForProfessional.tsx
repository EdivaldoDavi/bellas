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

  /* --------------------------------------------
     Selecionar / remover item individual
  -------------------------------------------- */
  function toggleId(id: string) {
    onSave(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  /* --------------------------------------------
     Selecionar / remover todos
  -------------------------------------------- */
  function toggleAll() {
    onSave(allSelected ? [] : services.map((s) => s.id));
  }

  /* --------------------------------------------
     Confirmar
  -------------------------------------------- */
  function handleConfirm() {
    onClose();
  }

  return (
    <div className={styles.servicesOverlay} onClick={onClose}>
      <div
        className={styles.servicesModal}
        onClick={(e) => e.stopPropagation()} // 🔒 impede fechar ao clicar dentro
      >
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
              onChange={() => {}}
              onClick={(e) => {
                e.stopPropagation();
                toggleAll();
              }}
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
                {/* CHECKBOX */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleId(s.id);
                  }}
                />

                {/* TEXTO */}
                <span className={styles.serviceName}>{s.name}</span>

                {/* DURAÇÃO */}
                {s.duration_min !== null && (
                  <span className={styles.serviceDuration}>
                    {s.duration_min} min
                  </span>
                )}
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
