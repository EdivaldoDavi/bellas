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

  function toggleId(id: string) {
    const newList = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];

    onSave(newList);
  }

  function toggleAll() {
    if (allSelected) onSave([]);
    else onSave(services.map((s) => s.id));
  }

  function confirm() {
    onSave(selectedIds);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()} // ← ESSENCIAL
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Selecionar serviços</h3>

          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.list}>
          {/* SELECT ALL */}
        <label
            className={styles.item}
            // Apenas bloqueia o clique para que ele não suba para o overlay pai
            onClick={(e) => { 
              e.stopPropagation(); // <-- ESSENCIAL para evitar o fechamento!
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              // A lógica de toggle acontece apenas AQUI.
              onChange={toggleAll}
            />

            <span className={styles.name}>Selecionar todos</span>
            <span className={styles.duration}></span>
          </label>

          {/* LISTA DE SERVIÇOS */}
          {services.map((s) => (
            <label
              key={s.id}
              className={styles.item}
              
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(s.id)}
                onChange={() => toggleId(s.id)}
               
              />

              <span className={styles.name}>{s.name}</span>

              <span className={styles.duration}>
                {s.duration_min ? `${s.duration_min} min` : ""}
              </span>
            </label>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.saveBtn} onClick={confirm}>
            Salvar seleção
          </button>
        </div>
      </div>
    </div>
  );
}
