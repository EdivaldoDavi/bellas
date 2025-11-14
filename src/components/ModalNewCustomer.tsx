import { useState } from "react";
import styles from "../css/ModalNewCustomer.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface ModalNewCustomerProps {
  tenantId: string;
  show: boolean;
  onClose: () => void;
  onSuccess?: (id: string, name: string) => void; // 🔥 agora opcional
}

export default function ModalNewCustomer({ tenantId, show, onClose, onSuccess }: ModalNewCustomerProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  if (!show) return null; // 🔥 impede renderização escondida

  async function handleSave() {
    if (!fullName.trim() || !phone.trim()) 
      return toast.warn("Preencha nome e telefone");

    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .insert([{ tenant_id: tenantId, full_name: fullName, customer_phone: phone }])
      .select()
      .single();

    setLoading(false);

    if (error) return toast.error("Erro ao cadastrar cliente");

    toast.success("Cliente cadastrado!");
    
    onSuccess?.(data.id, data.full_name); // 🔥 só dispara se vier da Agenda
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <h3>Novo Cliente</h3>

        <input
          className={styles.input}
          placeholder="Nome completo"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="Telefone"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />

        <button className={styles.saveBtn} disabled={loading} onClick={handleSave}>
          {loading ? "Salvando..." : "Salvar Cliente"}
        </button>

      </div>
    </div>
  );
}
