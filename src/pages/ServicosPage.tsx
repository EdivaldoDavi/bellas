// src/pages/ServicosPage.tsx
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import {  Plus, Pencil } from "lucide-react";
import { toast } from "react-toastify";

import styles from "../css/ServicosPage.module.css";
import ServiceForm from "../components/ServiceForm";
import { useNavigate, useParams, useLocation } from "react-router-dom";

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
  is_active: boolean;
  price_cents?: number | null;
};

export default function ServicosPage() {
  
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

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllServices, setShowAllServices] = useState(false);

  const [editingService, setEditingService] = useState<Service | null>(null);



  /* ============================================================
     LOAD (busca no Supabase)
  ============================================================ */
  useEffect(() => {
    if (!tenantId) return;

    if (pageMode === "edit" && params.id) {
      loadEditingService(params.id);
    } else if (pageMode === "new") {
      setEditingService(null);
      setLoading(false);
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, showAllServices, search, pageMode, params.id]);

  async function loadEditingService(serviceId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("id,name,duration_min,is_active,price_cents")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .single();

    if (error) {
      console.error("Erro ao carregar serviço para edição:", error);
      toast.error("Erro ao carregar serviço.");
      navigate("/servicos");
    } else {
      setEditingService((data || null) as any);
      setLoading(false);
    }
  }

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
    navigate(`/servicos/edit/${s.id}`);
  }

  /* ============================================================
     TOGGLE ATIVO / INATIVO
  ============================================================ */
  function confirmToggle(service: Service) {
    const action = service.is_active ? "inativar" : "ativar";

    toast(
      ({ closeToast }) => (
        <div style={{ textAlign: "center", padding: '20px' }}> {/* Adicionado padding aqui */}
          <p style={{ marginBottom: 12 }}>
            Deseja realmente <b>{action}</b> o serviço:
            <br />"{service.name}"?
          </p>

          <div className={styles.toastActions}>
            <button
              onClick={() => {
                closeToast?.();
                toggleActive(service);
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
        closeOnClick: false,
        draggable: false,
        icon: false,
        style: { background: "var(--card-bg)", color: "var(--text)", borderRadius: '12px' }
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
  // The 'close' function is removed as the page is no longer a modal.
  // Navigation is now handled by the sidebar.

  /* ============================================================
     RENDER
  ============================================================ */
  if (pageMode === "new" || pageMode === "edit") {
    if (loading) {
      return <div className={styles.container}><div className={styles.empty}>Carregando formulário...</div></div>;
    }
    return (
      <> 
        <div className={styles.container}>
          <ServiceForm
            tenantId={tenantId}
            mode={pageMode === "new" ? "new" : "edit"}
            service={pageMode === "edit" ? (editingService as any) : undefined}
            onSaveSuccess={(id, name, duration) => {
              // UPDATE OTIMISTA NA LISTA
              setServices((prev) => {
                const exists = prev.some((s) => s.id === id);
                if (exists) {
                  return prev.map((s) =>
                    s.id === id ? { ...s, name, duration_min: duration } : s
                  );
                }
                return [
                  { id, name, duration_min: duration, is_active: true, price_cents: null },
                  ...prev,
                ];
              });
              navigate("/servicos");
            }}
            onCancel={() => navigate("/servicos")}
          />
        </div>
      </>
    );
  }

  return (
    <> 
      <div className={styles.container}>
        {/* HEADER */}
        <div className={styles.header}>
          <h2>Serviços</h2>
        </div>

        {/* NOVO SERVIÇO */}
        <button
          className={styles.newBtn}
          style={{ backgroundColor: "var(--color-primary)" }}
          onClick={() => navigate("/servicos/new")}
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
                    <span>{svc.duration_min ?? 60} min</span>
                    <span
                      className={`${styles.statusBadge} ${svc.is_active ? styles.statusActive : styles.statusInactive}`}
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
                    <span className={styles.btnLabel}>Editar</span>
                  </button>

                  <button
                    className={`${styles.statusToggleButton} ${svc.is_active ? styles.inactiveState : styles.activeState}`}
                    onClick={() => confirmToggle(svc)}
                  >
                    {svc.is_active ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
        </div>

        {!showAllServices && !search.trim() && services.length >= 3 && (
          <button
            className={styles.newBtn}
            style={{ backgroundColor: "var(--color-primary)", marginTop: "1.5rem" }}
            onClick={() => setShowAllServices(true)}
          >
            Ver todos os serviços
          </button>
        )}
      </div>
    </> 
  );
}