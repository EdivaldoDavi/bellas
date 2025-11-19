import { X } from "lucide-react";
import styles from "../css/ModalSelectServiceForProfessional.module.css";

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

  /* ===========================================
     Funções de seleção
  ============================================ */

  function toggleId(id: string) {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];

    onSave(updated);
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

  /* ===========================================
     Render
  ============================================ */

  return (
    <div className={styles.overlay} onClick={onClose}>
      {/* impede fechar ao clicar dentro */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <h3 className={styles.title}>Selecionar serviços</h3>

          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* LISTA */}
        <div className={styles.list}>
          
          {/* Selecionar todos */}
          <label
            className={styles.item}
            onClick={() => toggleAll()}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => toggleAll()}
              onClick={(e) => e.stopPropagation()}
            />

            <span className={styles.name}>Selecionar todos</span>
            <span className={styles.duration}></span>
          </label>

          {/* Serviços individuais */}
          {services.map((s) => (
            <label
              key={s.id}
              className={styles.item}
              onClick={() => toggleId(s.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(s.id)}
                onChange={() => toggleId(s.id)}
                onClick={(e) => e.stopPropagation()}
              />

              <span className={styles.name}>{s.name}</span>

              <span className={styles.duration}>
                {s.duration_min ? `${s.duration_min} min` : ""}
              </span>
            </label>
          ))}
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>

          <button
            className={styles.saveBtn}
            onClick={handleConfirm}
          >
            Salvar seleção
          </button>
        </div>
      </div>
    </div>
  );
}
