import { useState } from "react";
import styles from "../css/Agenda.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";
interface ModalNewCustomerProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export default function ModalNewCustomer({ tenantId, onClose, onCreated }: ModalNewCustomerProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSave() {
    if (!fullName || !phone) return toast.warn("Preencha nome e telefone");

    const { data, error } = await supabase
      .from("customers")
      .insert([{ tenant_id: tenantId, full_name: fullName, customer_phone: phone }])
      .select()
      .single();

    if (error) return toast.error("Erro ao cadastrar cliente");

    toast.success("Cliente cadastrado!");
    onCreated(data.id);
    onClose();
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContentSmall}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={20} />
        </button>
        <h3>Novo Cliente</h3>

        <input className={styles.input} placeholder="Nome completo"
          value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input className={styles.input} placeholder="Telefone"
          value={phone} onChange={(e) => setPhone(e.target.value)} />

        <button className={styles.saveButton} onClick={handleSave}>
          Salvar Cliente
        </button>
      </div>
    </div>
  );
}
