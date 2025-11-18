// src/components/ModalNewCustomer.tsx
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import styles from "../css/ModalNewCustomer.module.css";

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
  onSuccess
}: ModalNewCustomerProps) {

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  /* ============================================================
     CARREGA DADOS NO MODO EDIÇÃO
  ============================================================ */
  useEffect(() => {
    if (!show) return;

    if (mode === "edit" && customer) {
      setFullName(customer.full_name);
      setPhone(customer.customer_phone);
    } else {
      setFullName("");
      setPhone("");
    }
  }, [show, mode, customer]);

  if (!show) return null;

  /* ============================================================
     SALVAR CLIENTE
  ============================================================ */
  async function handleSave() {
    if (!tenantId) {
      toast.error("Tenant não encontrado.");
      return;
    }

    const name = fullName.trim();
    const phoneClean = phone.replace(/\D/g, ""); // <-- mantém apenas números

    if (!name || !phoneClean) {
      toast.warn("Preencha nome e telefone.");
      return;
    }

    setLoading(true);

    try {
      /* ============================
         EDITAR CLIENTE
      ============================ */
      if (mode === "edit" && customer) {
        const { error } = await supabase
          .from("customers")
          .update({
            full_name: name,
            customer_phone: phoneClean
          })
          .eq("id", customer.id)
          .eq("tenant_id", tenantId);

        if (error) throw error;

        toast.success("Cliente atualizado!");
        onClose();
        return;
      }

      /* ============================
         NOVO CLIENTE
      ============================ */
      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            tenant_id: tenantId,
            full_name: name,
            customer_phone: phoneClean
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Cliente cadastrado!");

      onSuccess?.(data.id, data.full_name);

      if (mode === "agenda") {
        onClose();
      } else {
        setFullName("");
        setPhone("");
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

        {/* Botão fechar */}
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        {/* Título dinâmico */}
        <h3>
          {mode === "edit" ? "Editar Cliente" : "Novo Cliente"}
        </h3>

        {/* Nome */}
        <input
          className={styles.input}
          placeholder="Nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        {/* Telefone */}
        <input
          className={styles.input}
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* Botão salvar */}
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
