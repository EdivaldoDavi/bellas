import { useState, useMemo } from "react";
import styles from "../css/ModalSelectProfessional.module.css";
import { X, Plus } from "lucide-react";

interface Props {
  show: boolean;
  professionals: { id: string; name: string }[];
  onClose: () => void;
  onSelect: (id: string, name: string) => void;
  onAdd?: () => void; // Novo — abrir modal de criar profissional
}

export default function ModalSelectProfessional({
  show,
  professionals,
  onClose,
  onSelect,
  onAdd
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return professionals.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, professionals]);

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
        <button className={styles.closeIcon} onClick={onClose}>
          <X size={20}/>
        </button>

        <h3 className={styles.title}>Selecionar Profissional</h3>

        <input
          className={styles.searchInput}
          placeholder="Buscar profissional..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.listBox}>
          {filtered.length === 0 && (
            <p className={styles.empty}>Nenhum profissional encontrado</p>
          )}

          {filtered.map((p) => (
            <div
              key={p.id}
              className={styles.item}
              onClick={() => onSelect(p.id, p.name)}
            >
              <div className={styles.avatar}>
                {p.name.charAt(0).toUpperCase()}
              </div>

              <div className={styles.info}>
                <span className={styles.name}>{p.name}</span>
              </div>
            </div>
          ))}
        </div>

        {onAdd && (
          <button className={styles.addButton} onClick={onAdd}>
            <Plus size={18}/> Novo Profissional
          </button>
        )}

        <button className={styles.cancelButton} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
