import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Pencil } from "lucide-react";

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
  }, [tenantId, search]); // Adicionado 'search' como dependência

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
              background: "var(--color-primary)", // Use CSS variable
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
    if (!tenantId) return;

    setLoading(true);

    let query = supabase
      .from("professionals")
      .select("id, name, email, phone, is_active, created_at") // Incluído created_at para ordenação
      .eq("tenant_id", tenantId);

    const searchTerm = search.trim();

    if (searchTerm) {
      // Se houver termo de busca, pesquisa em nome, email e telefone
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      query = query.order("name"); // Ordena por nome ao buscar
    } else {
      // Se não houver termo de busca, carrega os 5 mais recentes
      query = query.order("created_at", { ascending: false }).limit(3);
    }

    const { data, error } = await query;

    if (!error) {
      setProfessionals(data as Professional[]);
    } else {
      console.error("Erro ao carregar profissionais:", error);
      toast.error("Erro ao carregar profissionais.");
    }

    setLoading(false);
  }

  /* EDITAR */
  function openEdit(id: string) {
    setEditId(id);
    setOpenModal(true);
  }

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
            style={{ backgroundColor: "var(--color-primary)" }} // Use CSS variable
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

            {!loading && professionals.length === 0 && (
              <div className={styles.empty}>Nenhum profissional encontrado.</div>
            )}

            {!loading &&
              professionals.map((p) => (
                <div key={p.id} className={styles.card}>
                  <div>
                    <div className={styles.title}>{p.name}</div>
                    <div className={styles.meta}>
                      {p.email || "Sem e-mail"} ·{" "}
                      <span style={{ color: p.is_active ? '#007bff' : '#dc3545', fontWeight: 'bold' }}>
                        {p.is_active ? "Ativo" : "Inativo"}
                      </span>
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
                    className={styles.statusToggleButton}
                    style={{ backgroundColor: p.is_active ? '#dc3545' : '#007bff', color: '#fff' }}
                    onClick={() => confirmToggle(p)}
                    >
                    {p.is_active ? 'Inativar' : 'Ativar'}
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