import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Pencil, Eye, EyeOff } from "lucide-react";

import { toast } from "react-toastify"; 
import ModalNewProfessional from "../components/ModalNewProfessional";
import styles from "../css/ProfessionalsPage.module.css";

type Professional = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

export default function ProfessionalsPage() {
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  /* LOAD */
  useEffect(() => {
    if (tenantId) load();
  }, [tenantId]);



async function toggleActive(p: Professional) {
  const { error } = await supabase
    .from("professionals")
    .update({ is_active: !p.is_active })
    .eq("tenant_id", tenantId)
    .eq("id", p.id);

  if (!error) {
    setProfessionals((old) =>
      old.map((x) =>
        x.id === p.id ? { ...x, is_active: !x.is_active } : x
      )
    );
  }
}

function confirmToggle(p: Professional) {
  const action = p.is_active ? "inativar" : "ativar";

  toast(
    ({ closeToast }) => (
      <div style={{ textAlign: "center" }}>
        <p style={{ marginBottom: 12 }}>
          Deseja realmente <b>{action}</b> o profissional:
          <br />"{p.name}"?
        </p>

        <button
          onClick={() => {
            closeToast?.();
            toggleActive(p);
          }}
          style={{
            marginRight: 10,
            padding: "6px 12px",
            borderRadius: 8,
            background: "#6d28d9",
            color: "#fff",
            border: "none",
            cursor: "pointer"
          }}
        >
          Confirmar
        </button>

        <button
          onClick={closeToast}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: "#2a2833",
            color: "#fff",
            border: "1px solid #555",
            cursor: "pointer"
          }}
        >
          Cancelar
        </button>
      </div>
    ),
    {
      autoClose: false,
      draggable: false,
      icon: false,
      closeOnClick: false,
      style: { background: "#1d1b23", color: "#fff" }
    }
  );
}


  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, email, phone, is_active")
      .eq("tenant_id", tenantId)
      .order("name");

    if (!error) {
      setProfessionals(data as Professional[]);
    }

    setLoading(false);
  }

  /* FILTRO */
  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    return t
      ? professionals.filter((p) => p.name.toLowerCase().includes(t))
      : professionals;
  }, [search, professionals]);

  /* EDITAR */
  function openEdit(id: string) {
    setEditId(id);
    setOpenModal(true);
  }

  /* CONFIRMAR */
  

  return (
    <>
      <div className={styles.overlay}>
        <div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <h2>Profissionais</h2>

            <button
              className={styles.closeBtn}
              onClick={() => history.back()}
            >
              <X size={20} />
            </button>
          </div>

          <button
            className={styles.newBtn}
            onClick={() => {
              setEditId(null);
              setOpenModal(true);
            }}
          >
            <Plus size={20} />
            <span>Novo profissional</span>
          </button>

          <input
            className={styles.search}
            placeholder="Buscar profissional..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className={styles.list}>
            {loading && <div className={styles.empty}>Carregando...</div>}

            {!loading && filtered.length === 0 && (
              <div className={styles.empty}>Nenhum profissional encontrado.</div>
            )}

            {!loading &&
              filtered.map((p) => (
                <div key={p.id} className={styles.card}>
                  <div>
                    <div className={styles.title}>{p.name}</div>
                    <div className={styles.meta}>
                      {p.email || "Sem e-mail"} ·{" "}
                      {p.is_active ? "Ativo" : "Inativo"}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => openEdit(p.id)}
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => confirmToggle(p)}
                    >
                    {p.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>

                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* MODAL PROFISSIONAL */}
      <ModalNewProfessional
        tenantId={tenantId!}
        show={openModal}
        editId={editId}
        mode="cadastro"
        onClose={() => {
          setOpenModal(false);
          setEditId(null);
        }}
        onSuccess={() => {
          setOpenModal(false);
          setEditId(null);
          load();
        }}
      />
    </>
  );
}
