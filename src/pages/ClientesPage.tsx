// src/pages/ClientesPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";

import ModalNewCustomer from "../components/ModalNewCustomer";

import styles from "../css/ClientesPage.module.css";

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

  const brandColor = tenant?.primary_color || "#22c55e";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  /* BRAND COLOR */
  useEffect(() => {
    if (tenant?.primary_color) {
      document.documentElement.style.setProperty(
        "--primary",
        tenant.primary_color
      );
    }
  }, [tenant]);

  /* LOAD CUSTOMERS */
  useEffect(() => {
    if (tenantId) load();
  }, [tenantId]);



  
  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("id,full_name,customer_phone,is_active")
      .eq("tenant_id", tenantId)
      .order("full_name");

    if (!error) setCustomers(data as Customer[]);
    setLoading(false);
  }

  /* FILTRO */
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return !t
      ? customers
      : customers.filter(c => c.full_name.toLowerCase().includes(t));
  }, [search, customers]);

  /* EDITAR */
  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setOpenModal(true);
  }

  /* CONFIRMAR ATIVAR / INATIVAR */
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
              border: "none",
              borderRadius: 8,
              background: brandColor,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Confirmar
          </button>

          <button
            onClick={closeToast}
            style={{
              padding: "6px 12px",
              border: "1px solid #555",
              borderRadius: 8,
              background: "#2a2833",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        icon: false,
        style: { background: "#1d1b23", color: "#fff" }
      }
    );
  }

  /* ATIVAR / DESATIVAR */
  async function toggleActive(customer: Customer) {
    const { error } = await supabase
      .from("customers")
      .update({ is_active: !customer.is_active })
      .eq("id", customer.id)
      .eq("tenant_id", tenantId);

    if (!error) {
      setCustomers(old =>
        old.map(c =>
          c.id === customer.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    }
  }

  /* FECHAR MODAL */
  function close() {
    navigate(-1);
  }

  return (
    <>
      <div className={styles.overlay} onClick={close}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          
          {/* HEADER */}
          <div className={styles.header}>
            <h2>Clientes</h2>

            <button className={styles.closeBtn} onClick={close}>
              <X size={20} />
            </button>
          </div>

          {/* NOVO CLIENTE */}
          <button
            className={styles.newBtn}
            style={{ backgroundColor: brandColor }}
            onClick={() => {
              setEditingCustomer(null);
              setOpenModal(true);
            }}
          >
            <Plus size={20} />
            <span>Novo cliente</span>
          </button>

          {/* BUSCA */}
          <input
            className={styles.search}
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* LISTA */}
          <div className={styles.list}>
                {!loading && customers.length === 0 && (
                <div className={styles.empty}>Nenhum cliente cadastrado ainda.</div>
                )}

                {!loading && customers.length > 0 && filtered.length === 0 && (
                <div className={styles.empty}>Nenhum cliente encontrado.</div>
                )}

            {!loading &&
              filtered.map(c => (
                <div key={c.id} className={styles.card}>

                  <div>
                    <div className={styles.title}>{c.full_name}</div>
                    <div className={styles.meta}>
                      {c.customer_phone} · {c.is_active ? "Ativo" : "Inativo"}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {/* EDITAR */}
                    <button
                      className={styles.iconBtn}
                      onClick={() => openEdit(c)}
                      title="Editar cliente"
                    >
                      ✏️
                    </button>

                    {/* ATIVAR / DESATIVAR */}
                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => confirmToggle(c)}
                      title={c.is_active ? "Inativar" : "Ativar"}
                    >
                      {c.is_active ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* MODAL */}
<ModalNewCustomer
   tenantId={tenantId}
   show={openModal}
   mode={editingCustomer ? "edit" : "cadastro"}
   customer={editingCustomer}
   onClose={() => setOpenModal(false)}
   onSuccess={() => load()}   // 👈 força reload real
/>
    </>
  );
}
