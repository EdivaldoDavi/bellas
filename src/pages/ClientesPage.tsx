// src/pages/ClientesPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Pencil, MessageCircle, Phone } from "lucide-react"; // Adicionado MessageCircle e Phone
import { toast } from "react-toastify";

import ModalNewCustomer from "../components/ModalNewCustomer";
import styles from "../css/ClientesPage.module.css";

import CopyButton from "../components/CopyButton";
import { dbPhoneToMasked, onlyDigits } from "../utils/phoneUtils";

type Customer = {
  id: string;
  full_name: string;
  customer_phone: string;
  is_active: boolean;
};

export default function ClientesPage() {
  const navigate = useNavigate();
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  /* ============================================================
     LOAD PRINCIPAL (3 clientes ou busca → todos)
  ============================================================ */
  useEffect(() => {
    if (tenantId) load();
  }, [tenantId, search]);

  async function load() {
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
     EDITAR
  ============================================================ */
  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setOpenModal(true);
  }

  /* ============================================================
     CONFIRMAR ATIVAR/INATIVAR
  ============================================================ */
  function confirmToggle(customer: Customer) {
    const action = customer.is_active ? "inativar" : "ativar";

    toast(
      ({ closeToast }) => (
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: 12 }}>
            Deseja realmente <b>{action}</b> o cliente:
            <br />"{customer.full_name}"?
          </p>

          <button
            onClick={() => {
              closeToast?.();
              toggleActive(customer);
            }}
            style={{
              marginRight: 10,
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
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
            }}
          >
            Cancelar
          </button>
        </div>
      ),
      { autoClose: false, draggable: false, icon: false, closeOnClick: false }
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

  function close() {
    navigate(-1);
  }

  /* ============================================================
     UI
  ============================================================ */
  return (
    <>
      <div className={styles.overlay} onClick={close}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2>Clientes</h2>
            <button className={styles.closeBtn} onClick={close}>
              <X size={20} />
            </button>
          </div>

          <button
            className={styles.newBtn}
            style={{ backgroundColor: "var(--color-primary)" }}
            onClick={() => {
              setEditingCustomer(null);
              setOpenModal(true);
            }}
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
            {loading && customers.length === 0 && (
              <div className={styles.empty}>Carregando...</div>
            )}

            {!loading && customers.length === 0 && (
              <div className={styles.empty}>Nenhum cliente encontrado.</div>
            )}

            {customers.map((c) => (
              <div key={c.id} className={styles.card}>
                <div>
                  <div className={styles.title}>{c.full_name}</div>

                  <div className={styles.meta}>
                    <div className={styles.phoneRow}> {/* Usar phoneRow aqui */}
                      <div className={styles.phone}>
                        📞 {dbPhoneToMasked(c.customer_phone ?? "")}
                      </div>
                      <div className={styles.actionIcons}>
                        {c.customer_phone && (
                          <>
                            <CopyButton value={onlyDigits(c.customer_phone ?? "")} />
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
                      style={{
                        color: c.is_active ? "#00c851" : "#dc3545",
                        fontWeight: "bold",
                      }}
                    >
                      {c.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button className={styles.iconBtn} onClick={() => openEdit(c)}>
                    <Pencil size={18} />
                  </button>

                  <button
                    className={styles.statusToggleButton}
                    style={{
                      backgroundColor: c.is_active ? "#dc3545" : "#007bff",
                      color: "#fff",
                    }}
                    onClick={() => confirmToggle(c)}
                  >
                    {c.is_active ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ModalNewCustomer
        tenantId={tenantId}
        show={openModal}
        mode={editingCustomer ? "edit" : "cadastro"}
        customer={editingCustomer}
        onClose={() => {
          setOpenModal(false);
          load();
        }}
        onSuccess={() => load()}
      />
    </>
  );
}