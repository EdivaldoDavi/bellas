// src/components/ModalSelectServiceForProfessional.tsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "../css/ModalNewProfessional.module.css";

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
};

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
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  // sempre que abrir o modal, sincroniza o estado local
  useEffect(() => {
    if (show) {
      setLocalSelected(selectedIds);
    }
  }, [show, selectedIds]);

  if (!show) return null;

  function toggle(id: string) {
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setLocalSelected(services.map((s) => s.id));
    } else {
      setLocalSelected([]);
    }
  }

  function handleSave() {
    onSave(localSelected);
  }

  return (
    <div className={styles.servicesOverlay}>
      <div className={styles.servicesModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.servicesHeader}>
          <h3>Selecionar serviços</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.servicesList}>
          {services.length === 0 ? (
            <p className={styles.emptyText}>
              Nenhum serviço cadastrado. Cadastre serviços primeiro.
            </p>
          ) : (
            <>
              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={
                    services.length > 0 &&
                    localSelected.length === services.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <span>Selecionar todos</span>
              </label>

              <div className={styles.servicesGrid}>
                {services.map((s) => (
                  <label key={s.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={localSelected.includes(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                    <span>{s.name}</span>
                    {s.duration_min != null && (
                      <span className={styles.serviceDuration}>
                        {s.duration_min} min
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.servicesFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
          >
            Salvar seleção
          </button>
        </div>
      </div>
    </div>
  );
}
