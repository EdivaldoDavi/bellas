import { useState, useEffect } from "react";
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

  // ✔ Estado local para manter seleção sem fechar modal
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds);

  // Quando abrir o modal, reseta o estado local
  useEffect(() => {
    setLocalSelected(selectedIds);
  }, [show, selectedIds]);

  const allSelected =
    services.length > 0 && localSelected.length === services.length;

  function toggleId(id: string) {
    setLocalSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function toggleAll() {
    if (allSelected) setLocalSelected([]);
    else setLocalSelected(services.map((s) => s.id));
  }

  function confirm() {
    onSave(localSelected); // ✔ Agora só salva aqui
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />

            <span className={styles.name}>Selecionar todos</span>
            <span className={styles.duration}></span>
          </label>

          {/* LISTA */}
          {services.map((s) => (
            <label
              key={s.id}
              className={styles.item}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={localSelected.includes(s.id)}
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
