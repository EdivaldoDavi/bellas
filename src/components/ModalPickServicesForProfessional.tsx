import { useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "../css/Agenda.module.css";

type Service = {
  id: string;
  name: string;
  duration_min?: number | null;
};

interface Props {
  show: boolean;
  services: Service[];
  selectedIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}

export default function ModalPickServicesForProfessional({
  show,
  services,
  selectedIds,
  onClose,
  onSave,
}: Props) {
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  // sempre que abrir, sincroniza com o estado vindo de fora
  useEffect(() => {
    if (show) {
      setLocalSelected(selectedIds);
    }
  }, [show, selectedIds]);

  if (!show) return null;

  function toggleOne(id: string) {
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setLocalSelected(services.map((s) => s.id));
    } else {
      setLocalSelected([]);
    }
  }

  const allSelected =
    services.length > 0 && localSelected.length === services.length;

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X />
        </button>

        <h3>Selecionar serviços do profissional</h3>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "10px 0 14px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <span>Selecionar todos</span>
        </label>

        <div className={styles.listServicesModal}>
          {services.map((s) => {
            const checked = localSelected.includes(s.id);
            return (
              <div
                key={s.id}
                className={styles.serviceOption}
                onClick={() => toggleOne(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(s.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <strong>{s.name}</strong>
                  {typeof s.duration_min === "number" && (
                    <span>⏱ {s.duration_min} min</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "#2a2833",
              color: "#fff",
              border: "1px solid #555",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            onClick={() => onSave(localSelected)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "#6d28d9",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Salvar seleção
          </button>
        </div>
      </div>
    </div>
  );
}
