// src/pages/ServicosPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus, Pencil } from "lucide-react";
import { toast } from "react-toastify";

import ModalNewService from "../components/ModalNewService";
import styles from "../css/ServicosPage.module.css";

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
  is_active: boolean;
  price_cents?: number | null;
};

export default function ServicosPage() {
  const navigate = useNavigate();
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllServices, setShowAllServices] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  /* ============================================================
     LOAD (busca no Supabase)
  ============================================================ */
  useEffect(() => {
    if (!tenantId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, showAllServices, search]);

  async function load() {
    if (!tenantId) return;

    setLoading(true);

    try {
      let query = supabase
        .from("services")
        .select("id,name,duration_min,is_active,price_cents,created_at")
        .eq("tenant_id", tenantId);

      const term = search.trim();

      if (term) {
        // Busca por nome
        query = query.ilike("name", `%${term}%`).order("name", {
          ascending: true,
        });
      } else {
        // Sem busca → mostra só 3 mais recentes, a menos que clique em "Ver todos"
        query = query.order("created_at", { ascending: false });
        if (!showAllServices) {
          query = query.limit(3);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar serviços:", error);
        toast.error("Erro ao carregar serviços.");
        setServices([]);
      } else {
        setServices((data || []) as Service[]);
      }
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     EDITAR
  ============================================================ */
  function openEdit(s: Service) {
    setEditingService(s);
    setOpenModal(true);
  }

  /* ============================================================
     TOGGLE ATIVO / INATIVO
  ============================================================ */
  function confirmToggle(service: Service) {
    const action = service.is_active ? "inativar" : "ativar";

    toast(
      ({ closeToast }) => (
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: 12 }}>
            Deseja realmente <b>{action}</b> o serviço:
            <br />"{service.name}"?
          </p>

          <button
            onClick={() => {
              closeToast?.();
              toggleActive(service);
            }}
            className={styles.confirmBtn}
            style={{
              marginRight: 10,
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Confirmar
          </button>

          <button
            onClick={closeToast}
            className={styles.cancelBtn}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "#2a2833",
              color: "#fff",
              border: "1px solid #555",
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
        style: { background: "#1d1b23", color: "#fff" },
      }
    );
  }

  async function toggleActive(service: Service) {
    if (!tenantId) return;

    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error(error);
      toast.error("Erro ao atualizar serviço.");
      return;
    }

    setServices((old) =>
      old.map((s) =>
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      )
    );
  }

  /* ============================================================
     CLOSE
  ============================================================ */
  function close() {
    navigate(-1);
  }

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      <div className={styles.overlay} onClick={close}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* HEADER */}
          <div className={styles.header}>
            <h2>Serviços</h2>
            <button className={styles.closeBtn} onClick={close}>
              <X size={20} />
            </button>
          </div>

          {/* NOVO SERVIÇO */}
          <button
            className={styles.newBtn}
            style={{ backgroundColor: "var(--color-primary)" }}
            onClick={() => {
              setEditingService(null);
              setOpenModal(true);
            }}
          >
            <Plus size={20} />
            <span>Novo serviço</span>
          </button>

          {/* BUSCA */}
          <input
            className={styles.search}
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* LISTA */}
          <div className={styles.list}>
            {loading && <div className={styles.empty}>Carregando...</div>}

            {!loading && services.length === 0 && (
              <div className={styles.empty}>Nenhum serviço encontrado.</div>
            )}

            {!loading &&
              services.length > 0 &&
              services.map((svc) => (
                <div key={svc.id} className={styles.card}>
                  <div>
                    <div className={styles.title}>{svc.name}</div>
                    <div className={styles.meta}>
                      {svc.duration_min ?? 60} min ·{" "}
                      <span
                        style={{
                          color: svc.is_active ? "#007bff" : "#dc3545",
                          fontWeight: "bold",
                        }}
                      >
                        {svc.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => openEdit(svc)}
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      className={styles.statusToggleButton}
                      style={{
                        backgroundColor: svc.is_active ? "#dc3545" : "#007bff",
                        color: "#fff",
                      }}
                      onClick={() => confirmToggle(svc)}
                    >
                      {svc.is_active ? "Inativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* BOTÃO "VER TODOS" (só quando está em modo preview) */}
          {!showAllServices && !search.trim() && services.length >= 3 && (
            <button
              className={styles.viewAllButton}
              style={{ backgroundColor: "var(--color-primary)" }}
              onClick={() => setShowAllServices(true)}
            >
              Ver todos os serviços
            </button>
          )}
        </div>
      </div>

      {/* MODAL NOVO/EDIT SERVIÇO */}
      <ModalNewService
        tenantId={tenantId}
        show={openModal}
        mode={editingService ? "edit" : "cadastro"}
        service={
  editingService
    ? { ...editingService, price_cents: editingService.price_cents ?? null }
    : undefined
}
        onClose={() => {
          setOpenModal(false);
          setEditingService(null);
          load(); // recarrega lista após salvar
        }}
        // isFromOnboarding não é passado aqui, mantendo o comportamento padrão
      />
    </>
  );
}