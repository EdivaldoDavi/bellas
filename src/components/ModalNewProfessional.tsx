import ProfessionalForm from "../components/ProfessionalForm";
import styles from "../css/ModalNewProfessional.module.css";
import { createPortal } from "react-dom";

interface ModalNewProfessionalProps {
  tenantId?: string;
  show: boolean;
  mode?: "agenda" | "cadastro" | "new" | "edit";
  onClose: () => void;
  onSuccess?: (id: string, name: string) => void;
  editId?: string | null;
}

export default function ModalNewProfessional({
  tenantId,
  show,
  mode = "cadastro",
  onClose,
  onSuccess,
  editId,
}: ModalNewProfessionalProps) {
  if (!show) return null;

  // Para o Onboarding e uso atual, consideramos somente criação (new).
  const isEditing = mode === "edit" && !!editId;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <ProfessionalForm
          tenantId={tenantId}
          mode={isEditing ? "edit" : "new"}
          professional={undefined}
          onCancel={onClose}
          onSaveSuccess={(id, name) => {
            onSuccess?.(id, name);
            onClose();
          }}
        />
      </div>
    </div>,
    document.body
  );
}