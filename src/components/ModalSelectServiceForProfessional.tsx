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

export default function ModalSelectServiceForProfessional({
  show,
  services,
  selectedIds,
  onClose,
  onSave,
}: Props) {
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  // Sempre que abrir o modal, sincroniza o estado local
  useEffect(() => {
    if (show) {
      setLocalSelected(selectedIds);
    }
  }, [show, selectedIds]);

  if (!show) return null;

  const allIds = services.map((s) => s.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => localSelected.includes(id));

  function toggle(id: string) {
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setLocalSelected([]);
    } else {
      setLocalSelected(allIds);
    }
  }

  function handleSave() {
    onSave(localSelected);
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X />
        </button>

        <h3>Selecionar serviços</h3>

        {/* Selecionar todos */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "8px 0 12px",
          }}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
          />
          <span>Selecionar todos</span>
        </label>

        <div className={styles.listServicesModal}>
          {services.length === 0 && (
            <div style={{ padding: 12, textAlign: "center", opacity: 0.8 }}>
              Nenhum serviço cadastrado.
            </div>
          )}

          {services.map((s) => {
            const checked = localSelected.includes(s.id);

            return (
              <label
                key={s.id}
                className={styles.serviceOption}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(s.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <strong>{s.name}</strong>
                </div>
                {typeof s.duration_min === "number" && (
                  <span>⏱ {s.duration_min} min</span>
                )}
              </label>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #555",
              background: "#2a2833",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Salvar seleção
          </button>
        </div>
      </div>
    </div>
  );
}
