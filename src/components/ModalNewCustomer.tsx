// src/components/ModalNewCustomer.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import styles from "../css/ModalNewCustomer.module.css";

// 📌 Imports do util de telefone
import {
  formatPhoneInput,
  maskedToDbPhone,
  dbPhoneToMasked,
  isValidMaskedPhone,
} from "../utils/phoneUtils";

interface Customer {
  id: string;
  full_name: string;
  customer_phone: string;
  is_active?: boolean;
}

interface ModalNewCustomerProps {
  tenantId?: string;
  show: boolean;
  mode: "agenda" | "cadastro" | "edit";
  customer?: Customer | null;
  onClose: () => void;
  onSuccess?: (id: string, name: string) => void;
}

export default function ModalNewCustomer({
  tenantId,
  show,
  mode,
  customer,
  onClose,
  onSuccess,
}: ModalNewCustomerProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(""); // agora com máscara
  const [loading, setLoading] = useState(false);

  /* ============================================================
     CARREGAR DADOS NO MODO EDIÇÃO
  ============================================================ */
  useEffect(() => {
    if (!show) return;

    if (mode === "edit" && customer) {
      setFullName(customer.full_name);
      setPhone(dbPhoneToMasked(customer.customer_phone)); // máscara
    } else {
      setFullName("");
      setPhone("");
    }
  }, [show, mode, customer]);

  if (!show) return null;

  /* ============================================================
     SALVAR
  ============================================================ */
  async function handleSave() {
    if (!tenantId) return toast.error("Tenant não encontrado.");

    const name = fullName.trim();
    const dbPhone = maskedToDbPhone(phone); // "5514996552177"

    if (!name || !isValidMaskedPhone(phone)) {
      toast.warn("Informe nome e um telefone válido.");
      return;
    }

    setLoading(true);

    try {
      /* ============================
         EDITAR
      ============================ */
      if (mode === "edit" && customer) {
        const { error } = await supabase
          .from("customers")
          .update({
            full_name: name,
            customer_phone: dbPhone,
          })
          .eq("id", customer.id)
          .eq("tenant_id", tenantId);

        if (error) throw error;

        toast.success("Cliente atualizado!");
        onClose();
        return;
      }

      /* ============================
         NOVO
      ============================ */
      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            tenant_id: tenantId,
            full_name: name,
            customer_phone: dbPhone,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Cliente cadastrado!");

      onSuccess?.(data.id, data.full_name);

      if (mode !== "agenda") {
        setFullName("");
        setPhone("");
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar cliente.");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     UI
  ============================================================ */
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{mode === "edit" ? "Editar Cliente" : "Novo Cliente"}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <input
          className={styles.input}
          placeholder="Nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          maxLength={17}
        />

        <button
          className={styles.saveBtn}
          disabled={loading}
          onClick={handleSave}
        >
          {loading
            ? "Salvando..."
            : mode === "edit"
            ? "Salvar Alterações"
            : "Salvar Cliente"}
        </button>
      </div>
    </div>
  );
}
