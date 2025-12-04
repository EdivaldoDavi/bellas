// src/pages/ProfessionalsPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Pencil, MessageCircle, Phone } from "lucide-react"; // Adicionado MessageCircle e Phone
import { toast } from "react-toastify"; // Corrected import statement

import ModalNewProfessional from "../components/ModalNewProfessional";
// import CopyButton from "../components/CopyButton"; // REMOVIDO
import { dbPhoneToMasked, onlyDigits } from "../utils/phoneUtils";
import styles from "../css/ProfessionalsPage.module.css";
import { useLayoutContext } from "../components/layout/LayoutContext"; // Importar o hook do contexto
import { useLocation, useNavigate } from "react-router-dom"; // Adicionado useLocation e useNavigate

type Professional = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

type ProfessionalsPageProps = {
  onClose?: () => void; // usado no onboarding
};

export default function ProfessionalsPage({ onClose }: ProfessionalsPageProps) {
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;
  const navigate = useNavigate();
  const location = useLocation(); // Obter o objeto location

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { openSidebarAndNavigate } = useLayoutContext(); // Usar o contexto

  // ================================
  // LOAD
  // ================================
  useEffect(() => {
    if (tenantId) load();
  }, [tenantId, search]);

  async function load() {
    if (!tenantId) return;

    setLoading(true);

    let query = supabase
      .from("professionals")
      .select("id, name, email, phone, is_active, created_at")
      .eq("tenant_id", tenantId);

    const s = search.trim();

    if (s) {
      query = query.or(
        `name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`
      );
      query = query.order("name");
    } else {
      query = query.order("created_at", { ascending: false }).limit(3);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar profissionais.");
      console.error(error);
    } else {
      setProfessionals(data as Professional[]);
    }

    setLoading(false);
  }

  // ================================
  // CLOSE HANDLER
  // ================================
  // The 'close' function is removed as the page is no longer a modal.
  // Navigation is now handled by the sidebar.

  // ================================
  // ATIVAR / INATIVAR
  // ================================
  async function toggleActive(p: Professional) {
    const { error } = await supabase
      .from("professionals")
      .update({ is_active: !p.is_active })
      .eq("tenant_id", tenantId)
      .eq("id", p.id);

    if (error) return;

    setProfessionals((old) =>
      old.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    );
  }

  function confirmToggle(p: Professional) {
    const action = p.is_active ? "inativar" : "ativar";

    toast(
      ({ closeToast }) => (
        <div style={{ textAlign: "center", padding: '20px' }}> {/* Adicionado padding aqui */}
          <p style={{ marginBottom: 12 }}>
            Deseja realmente <b>{action}</b> o profissional:
            <br />"{p.name}"?
          </p>

          <div className={styles.toastActions}>
            <button
              onClick={() => {
                closeToast?.();
                toggleActive(p);
              }}
              className={`${styles.toastButton} ${styles.toastConfirmButton}`}
            >
              Confirmar
            </button>

            <button
              onClick={closeToast}
              className={`${styles.toastButton} ${styles.toastCancelButton}`}
            >
              Cancelar
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        draggable: false,
        icon: false,
        closeOnClick: false,
        style: { background: "var(--card-bg)", color: "var(--text)", borderRadius: '12px' },
      }
    );
  }

  // ================================
  // EDITAR PROFISSIONAL
  // ================================
  function openEdit(id: string) {
    setEditId(id);
    setOpenModal(true);
  }

  // ================================
  // RENDER
  // ================================
  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2>Profissionais</h2>

        {/* The close button is removed as the page is no longer a modal */}
      </div>

      {/* NOVO PROFISSIONAL */}
      <button
        className={styles.newBtn}
        style={{ backgroundColor: "var(--color-primary)" }}
        onClick={() => {
          setEditId(null);
          setOpenModal(true);
        }}
      >
        <Plus size={20} />
        <span>Novo profissional</span>
      </button>

      {/* SEARCH */}
      <input
        className={styles.search}
        placeholder="Buscar profissional..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* LIST */}
      <div className={styles.list}>
        {loading && (
          <div className={styles.empty}>Carregando profissionais...</div>
        )}

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
                  <span
                    style={{
                      color: p.is_active ? "#00c851" : "#dc3545",
                      fontWeight: "bold",
                    }}
                  >
                    {p.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {/* TELEFONE COM WHATSAPP E LIGAÇÃO */}
                <div className={styles.phoneWrapper}>
                  <span>📞 {dbPhoneToMasked(p.phone ?? "")}</span>
                  <div className={styles.actionIcons}>
                    {p.phone && (
                      <>
                        <button
                          className={styles.iconButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/55${onlyDigits(p.phone || '')}`, '_blank');
                          }}
                          title="Enviar mensagem WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${onlyDigits(p.phone || '')}`;
                          }}
                          title="Ligar para o profissional"
                        >
                          <Phone size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className={styles.actions}>
                <button
                  className={styles.iconBtn}
                  onClick={() => openEdit(p.id)}
                >
                  <Pencil size={18} />
                </button>

                <button
                  className={`${styles.statusToggleButton} ${p.is_active ? styles.inactiveState : styles.activeState}`}
                  onClick={() => confirmToggle(p)}
                >
                  {p.is_active ? "Inativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* MODAL */}
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
    </div>
  );
}