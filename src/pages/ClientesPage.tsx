
// src/pages/ClientesPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Pencil } from "lucide-react";
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
  const [showAllCustomers, setShowAllCustomers] = useState(false); // Novo estado para controlar a exibição de todos os clientes

  const [openModal, setOpenModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  /* aplica Brand Color */
  useEffect(() => {
    if (tenant?.primary_color) {
      document.documentElement.style.setProperty("--primary", tenant.primary_color);
    }
  }, [tenant]);

  /* LOAD customers */
  useEffect(() => {
    if (tenantId) load();
  }, [tenantId, showAllCustomers]); // Adicionado showAllCustomers como dependência

async function load() {
  if (!tenantId) return;

  setLoading(true);

  let query = supabase
    .from("customers")
    .select(`
      id,
      full_name,
      customer_phone,
      is_active
    `)
    .eq("tenant_id", tenantId)
    .order("full_name", { ascending: true });

  // Limita a 3 registros se não estiver no modo 'Ver todos' e não houver pesquisa
  if (!showAllCustomers && !search.trim()) {
    query = query.limit(3);
  }

  const { data, error } = await query;

  if (error) {
    console.error("LOAD ERROR:", error);
  }

  setCustomers(data || []);
  setLoading(false);
}

  /* FILTRAGEM */
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return t
      ? customers.filter(c => c.full_name.toLowerCase().includes(t))
      : customers;
  }, [customers, search]);

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setOpenModal(true);
  }

  /* CONFIRMAR toggle */
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
              background: brandColor,
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

  function close() {
    navigate(-1);
  }

  return (
    <>
      <div className={styles.overlay} onClick={close}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          
          <div className={styles.header}>
            <h2>Clientes</h2>
            <button className={styles.closeBtn} onClick={close}>
              <X size={20} />
            </button>
          </div>

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

          <input
            className={styles.search}
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

                <div className={styles.list}>

                {loading && (
                    <div className={styles.empty}>Carregando...</div>
                )}

                {!loading && customers.length === 0 && (
                    <div className={styles.empty}>Nenhum cliente cadastrado ainda.</div>
                )}

                {!loading && customers.length > 0 && filtered.length === 0 && (
                    <div className={styles.empty}>Nenhum cliente encontrado.</div>
                )}

                {!loading && filtered.length > 0 && filtered.map(c => (
                    <div key={c.id} className={styles.card}>
                    <div>
                        <div className={styles.title}>{c.full_name}</div>
                        <div className={styles.meta}>
                        {c.customer_phone} ·{" "}
                        <span style={{ color: c.is_active ? '#007bff' : '#dc3545', fontWeight: 'bold' }}>
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
                        style={{ backgroundColor: c.is_active ? '#dc3545' : '#007bff', color: '#fff' }}
                        onClick={() => confirmToggle(c)}
                        >
                        {c.is_active ? 'Inativar' : 'Ativar'}
                        </button>
                    </div>
                    </div>
                ))}

                </div>
                {!showAllCustomers && customers.length > 3 && !search.trim() && (
                  <button
                    className={styles.viewAllButton}
                    style={{ backgroundColor: brandColor }}
                    onClick={() => setShowAllCustomers(true)}
                  >
                    Ver todos os clientes
                  </button>
                )}

        </div>
      </div>

        <ModalNewCustomer
        tenantId={tenantId}
        show={openModal}
        mode={editingCustomer ? "edit" : "cadastro"}
        customer={editingCustomer}
        onClose={() => {
            setOpenModal(false);
            load();           // 👈 SEMPRE recarrega ao fechar (solução imediata)
        }}
        onSuccess={() => load()}   // para o modo cadastro
        />
    </>
  );
}
