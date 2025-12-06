// src/pages/ClientesPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom"; // Importar useNavigate, useParams, useLocation

import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { Plus, Pencil, MessageCircle, Phone } from "lucide-react";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/LoadingSpinner";

import NewCustomerForm from "../components/ModalNewCustomer"; // Renomeado para NewCustomerForm
import { dbPhoneToMasked, onlyDigits } from "../utils/phoneUtils";
import styles from "../css/ClientesPage.module.css";

type Customer = {
  id: string;
  full_name: string;
  customer_phone: string;
  is_active: boolean;
};

export default function ClientesPage() {
  const navigate = useNavigate();
  const params = useParams(); // Para pegar o ID na edição
  const location = useLocation(); // Para saber se é /new ou /edit

  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Determina o modo da página: 'list', 'new', ou 'edit'
  const pageMode = location.pathname.endsWith("/new")
    ? "new"
    : params.id
    ? "edit"
    : "list";

  /* ============================================================
     LOAD PRINCIPAL (3 clientes ou busca → todos)
  ============================================================ */
  useEffect(() => {
    if (tenantId && pageMode === "list") {
      loadCustomers();
    }
  }, [tenantId, search, pageMode]);

  async function loadCustomers() {
    if (!tenantId) return;

    setLoading(true);

    let query = supabase
      .from("customers")
      .select("id, full_name, customer_phone, is_active")
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true });

    // 🔍 BUSCA GLOBAL SEM LIMITE
    if (search.trim().length > 0) {
      query = query.or(
        `full_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    } else {
      // 🔥 LISTA APENAS 3 inicialmente
      query = query.limit(3);
    }

    const { data } = await query;
    setCustomers(data || []);
    setLoading(false);
  }

  /* ============================================================
     CARREGAR CLIENTE PARA EDIÇÃO
  ============================================================ */
  useEffect(() => {
    if (pageMode === "edit" && params.id && tenantId) {
      loadEditingCustomer(params.id);
    } else if (pageMode === "new") {
      setEditingCustomer(null); // Garante que não há cliente de edição ao criar um novo
    }
  }, [pageMode, params.id, tenantId]);

  async function loadEditingCustomer(customerId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, customer_phone, is_active")
      .eq("tenant_id", tenantId)
      .eq("id", customerId)
      .single();

    if (error) {
      toast.error("Erro ao carregar cliente para edição.");
      console.error(error);
      navigate("/clientes"); // Volta para a lista se houver erro
    } else {
      setEditingCustomer(data as Customer);
    }
    setLoading(false);
  }

  /* ============================================================
     CONFIRMAR ATIVAR/INATIVAR
  ============================================================ */
  function confirmToggle(customer: Customer) {
    const action = customer.is_active ? "inativar" : "ativar";

    toast(
      ({ closeToast }) => (
        <div style={{ textAlign: "center", padding: '20px' }}>
          <p style={{ marginBottom: 12 }}>
            Deseja realmente <b>{action}</b> o cliente:
            <br />"{customer.full_name}"?
          </p>

          <div className={styles.toastActions}>
            <button
              onClick={() => {
                closeToast?.();
                toggleActive(customer);
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
      { autoClose: false, draggable: false, icon: false, closeOnClick: false,
        style: { background: "var(--card-bg)", color: "var(--text)", borderRadius: '12px' }
      }
    );
  }

  async function toggleActive(customer: Customer) {
    const { error } = await supabase
      .from("customers")
      .update({ is_active: !customer.is_active })
      .eq("id", customer.id)
      .eq("tenant_id", tenantId);

    if (!error) {
      setCustomers((old) =>
        old.map((c) =>
          c.id === customer.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    }
  }

  /* ============================================================
     UI
  ============================================================ */
  if (pageMode === "new" || pageMode === "edit") {
    if (loading) {
      return <LoadingSpinner />;
    }
    return (
      <div className={styles.container}>
        <NewCustomerForm
          tenantId={tenantId}
          mode={pageMode === "new" ? "new" : "edit"}
          customer={editingCustomer}
          onSaveSuccess={(id, name) => {
            // UPDATE OTIMISTA NA LISTA
            setCustomers((prev) => {
              const exists = prev.some((c) => c.id === id);
              if (exists) {
                return prev.map((c) =>
                  c.id === id ? { ...c, full_name: name } : c
                );
              }
              // adiciona no topo com dados mínimos; re-fetch acontece depois
              return [
                { id, full_name: name, customer_phone: "", is_active: true },
                ...prev,
              ];
            });
            navigate("/clientes"); // volta para a lista
          }}
          onCancel={() => navigate("/clientes")}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Clientes</h2>
      </div>

      <button
        className={styles.newBtn}
        style={{ backgroundColor: "var(--color-primary)" }}
        onClick={() => navigate("/clientes/new")} // Navega para a página de novo cliente
      >
        <Plus size={20} />
        <span>Novo cliente</span>
      </button>

      <input
        className={styles.search}
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.list}>
        {loading && customers.length === 0 && <LoadingSpinner />}

        {!loading && customers.length === 0 && (
          <div className={styles.empty}>Nenhum cliente encontrado.</div>
        )}

        {customers.map((c) => (
          <div key={c.id} className={styles.card}>
            <div>
              <div className={styles.title}>{c.full_name}</div>

              <div className={styles.meta}>
                <div className={styles.phoneRow}>
                  <div className={styles.phone}>
                    📞 {dbPhoneToMasked(c.customer_phone ?? "")}
                  </div>
                  <div className={styles.actionIcons}>
                    {c.customer_phone && (
                      <>
                        <button
                          className={styles.iconButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/55${onlyDigits(c.customer_phone)}`, '_blank');
                          }}
                          title="Enviar mensagem WhatsApp"
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${onlyDigits(c.customer_phone)}`;
                          }}
                          title="Ligar para o cliente"
                        >
                          <Phone size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={`${styles.statusBadge} ${c.is_active ? styles.statusActive : styles.statusInactive}`}
                >
                  {c.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.iconBtn} onClick={() => navigate(`/clientes/edit/${c.id}`)}>
                <Pencil size={18} />
                <span className={styles.btnLabel}>Editar</span>
              </button>

              <button
                className={`${styles.statusToggleButton} ${c.is_active ? styles.inactiveState : styles.activeState}`}
                onClick={() => confirmToggle(c)}
              >
                {c.is_active ? "Inativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}