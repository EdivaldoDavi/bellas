import ServiceForm from "../components/ServiceForm";
import styles from "../css/ModalNewService.module.css";
import { createPortal } from "react-dom";

interface ModalNewServiceProps {
  tenantId?: string;
  show: boolean;
  mode?: "agenda" | "edit" | "cadastro" | "new";
  service?: {
    id: string;
    name: string;
    duration_min: number | null;
    price_cents?: number | null;
    is_active?: boolean;
  };
  onClose: () => void;
  onSuccess?: (id: string, name: string, duration: number) => void;
  isFromOnboarding?: boolean;
}

export default function ModalNewService({
  tenantId,
  show,
  mode = "cadastro",
  service,
  onClose,
  onSuccess,
  isFromOnboarding = false,
}: ModalNewServiceProps) {
  if (!show) return null;

  const isEditing = mode === "edit" && !!service;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <ServiceForm
          tenantId={tenantId}
          mode={isEditing ? "edit" : "new"}
          service={service as any}
          isFromOnboarding={isFromOnboarding}
          onCancel={onClose}
          onSaveSuccess={(id, name, duration) => {
            onSuccess?.(id, name, duration);
            onClose();
          }}
        />
      </div>
    </div>,
    document.body
  );
}