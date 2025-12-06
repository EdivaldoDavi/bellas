// src/pages/ProfessionalsPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { Plus, Pencil, MessageCircle, Phone } from "lucide-react";
import { toast } from "react-toastify";

import { dbPhoneToMasked, onlyDigits } from "../utils/phoneUtils";
import styles from "../css/ProfessionalsPage.module.css";
import ProfessionalForm from "../components/ProfessionalForm";
import { useNavigate, useParams, useLocation } from "react-router-dom";

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

  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const pageMode = location.pathname.endsWith("/new")
    ? "new"
    : params.id
    ? "edit"
    : "list";

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    if (pageMode === "edit" && params.id) {
      loadEditingProfessional(params.id);
    } else if (pageMode === "new") {
      setEditingProfessional(null);
      setLoading(false);
    } else {
      load();
    }
  }, [tenantId, search, pageMode, params.id]);

  async function loadEditingProfessional(id: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("professionals")
      .select("id,name,email,phone,is_active")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Erro ao carregar profissional.");
      console.error(error);
      navigate("/profissionais");
    } else {
      setEditingProfessional(data as any);
      setLoading(false);
    }
  }

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

  function openEdit(id: string) {
    navigate(`/profissionais/edit/${id}`);
  }

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
        <div style={{ textAlign: "center", padding: '20px' }}>
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

  if (pageMode === "new" || pageMode === "edit") {
    if (loading) {
      return <div className={styles.container}><div className={styles.empty}>Carregando formulário...</div></div>;
    }
    return (
      <div className={styles.container}>
        <ProfessionalForm
          tenantId={tenantId!}
          mode={pageMode === "new" ? "new" : "edit"}
          professional={pageMode === "edit" ? (editingProfessional as any) : undefined}
          onCancel={() => navigate("/profissionais")}
          onSaveSuccess={() => {
            navigate("/profissionais");
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h2>Profissionais</h2>
      </div>

      {/* NOVO PROFISSIONAL */}
      <button
        className={styles.newBtn}
        style={{ backgroundColor: "var(--color-primary)" }}
        onClick={() => navigate("/profissionais/new")}
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
                  <span className={`${styles.statusBadge} ${p.is_active ? styles.statusActive : styles.statusInactive}`}>
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
                  <span className={styles.btnLabel}>Editar</span>
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
    </div>
  );
}