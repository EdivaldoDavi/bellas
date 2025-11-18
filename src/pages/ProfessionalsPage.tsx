// src/pages/ProfessionalsPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../css/ProfessionalsPage.module.css";
import ModalNewProfessional from "../components/ModalNewProfessional";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
type Professional = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
};

export default function ProfessionalsPage() {
   const { tenant } = useUserAndTenant();
   const tenantId = tenant?.id;
 
  const [list, setList] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ===========================================================
  // LOAD LIST
  // ===========================================================
  async function loadProfessionals() {
    if (!tenantId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, email, phone, is_active ")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar profissionais");
      console.error(error);
    } else {
      setList(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProfessionals();
  }, [tenantId]);

  // ===========================================================
  // ATIVAR / DESATIVAR
  // ===========================================================
  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from("professionals")
      .update({ is_active: !current })
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }

    toast.success("Atualizado!");
    loadProfessionals();
  }

  // ===========================================================
  // OPEN EDIT
  // ===========================================================
  function openEdit(id: string) {
    setEditId(id);
    setShowModal(true);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Profissionais</h2>

        <button
          className={styles.newBtn}
          onClick={() => {
            setEditId(null);
            setShowModal(true);
          }}
        >
          + Novo Profissional
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>Carregando...</p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>Nenhum profissional cadastrado.</p>
      ) : (
        <div className={styles.list}>
          {list.map((p) => (
            <div key={p.id} className={styles.item}>
              <div className={styles.info}>
                <strong>{p.name}</strong>
                {p.email && <span>{p.email}</span>}
                {p.phone && <span>{p.phone}</span>}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.editBtn}
                  onClick={() => openEdit(p.id)}
                >
                  Editar
                </button>

                <button
                  className={
                    p.is_active ? styles.activeBtn : styles.inactiveBtn
                  }
                  onClick={() => toggleActive(p.id, p.is_active)}
                >
                  {p.is_active ? "Ativo" : "Inativo"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
      <ModalNewProfessional
            tenantId={tenantId!}
            show={showModal}
            mode="cadastro"
            editId={editId}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
                setShowModal(false);
                loadProfessionals();
            }}
            />
      )}
    </div>
  );
}
