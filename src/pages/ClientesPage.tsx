// src/pages/ClientesPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Pencil } from "lucide-react";
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

const PAGE_SIZE = 20;

export default function ClientesPage() {
  const navigate = useNavigate();
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // paginação
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  /* ============================================================
     LOAD — PAGINADO
  ============================================================ */
  const load = useCallback(
    async (reset: boolean = false) => {
      if (!tenantId) return;
      setLoading(true);

      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("customers")
        .select("id, full_name, customer_phone, is_active")
        .eq("tenant_id", tenantId)
        .order("full_name", { ascending: true })
        .range(from, to);

      // 🔍 busca direta no Supabase
      if (search.trim().length > 1) {
        query = query.or(
          `full_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // 🔄 resetar lista ao iniciar busca ou atualizar
      if (reset) {
        setCustomers(data || []);
        setPage(0);
      } else {
        setCustomers((old) => [...old, ...(data || [])]);
      }

      // se trouxe menos que a página, acabou
      setHasMore((data?.length || 0) === PAGE_SIZE);

      setLoading(false);
    },
    [tenantId, page, search]
  );

  /* ============================================================
     INITIAL LOAD + SEARCH
  ============================================================ */
  useEffect(() => {
    if (tenantId) load(true);
  }, [tenantId, search]);

  /* ============================================================
     LOAD MORE
  ============================================================ */
  function loadMore() {
    if (!hasMore) return;
    setPage((p) => p + 1);
  }

  useEffect(() => {
    if (page > 0) load();
  }, [page]);

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
          c.id === customer.id
            ? { ...c, is_active: !c.is_active }
            : c
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
                    <div className={styles.phoneWrapper}>
                      📞 {dbPhoneToMasked(c.customer_phone ?? "")}
                      <CopyButton value={onlyDigits(c.customer_phone ?? "")} />
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

          {/* botão carregar mais */}
          {hasMore && !loading && (
            <button className={styles.viewAllButton} onClick={loadMore}>
              Carregar mais
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
          load(true);
        }}
        onSuccess={() => load(true)}
      />
    </>
  );
}
