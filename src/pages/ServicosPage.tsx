// src/pages/ServicosPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

import { X, Plus,Eye, EyeOff} from "lucide-react";
import { toast } from "react-toastify";

import ModalNewService from "../components/ModalNewService";
import styles from "../css/ServicosPage.module.css";

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
  is_active: boolean;
};

export default function ServicosPage() {
  const navigate = useNavigate();
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;

  const brandColor = tenant?.primary_color || "#22c55e";

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  /* ============================================================
     LOAD SERVICES
  ============================================================ */
  useEffect(() => {
    if (tenantId) load();
  }, [tenantId]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("services")
     .select("id,name,duration_min,is_active,price_cents")
      .eq("tenant_id", tenantId)
      .order("name");

    if (!error) setServices(data as Service[]);
    setLoading(false);
  }

  /* ============================================================
     FILTRO EM TEMPO REAL
  ============================================================ */
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return !t ? services : services.filter(s => s.name.toLowerCase().includes(t));
  }, [search, services]);

  /* ============================================================
     EDITAR SERVIÇO
  ============================================================ */
  function openEdit(s: Service) {
    setEditingService(s);
    setOpenModal(true);
  }

  /* ============================================================
     ATIVAR / INATIVAR COM CONFIRMAÇÃO
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

  async function toggleActive(service: Service) {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id)
      .eq("tenant_id", tenantId);

    if (!error) {
      setServices(old =>
        old.map(s => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
  }

  /* ============================================================
     FECHAR MODAL
  ============================================================ */
  function close() {
    navigate(-1);
  }

  return (
    <>
      {/* OVERLAY */}
      <div className={styles.overlay} onClick={close}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className={styles.header}>
            <h2>Serviços</h2>

            <button className={styles.closeBtn} onClick={close}>
              <X size={20} />
            </button>
          </div>

          {/* Novo serviço */}
          <button
            className={styles.newBtn}
            style={{ backgroundColor: brandColor }}
            onClick={() => {
              setEditingService(null);
              setOpenModal(true);
            }}
          >
            <Plus size={20} />
            <span>Novo serviço</span>
          </button>

          {/* Busca */}
          <input
            className={styles.search}
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Lista */}
          <div className={styles.list}>
            {loading && <div className={styles.empty}>Carregando...</div>}

            {!loading && filtered.length === 0 && (
              <div className={styles.empty}>Nenhum serviço encontrado.</div>
            )}

            {!loading &&
              filtered.map((svc) => (
                <div key={svc.id} className={styles.card}>

                  <div>
                    <div className={styles.title}>{svc.name}</div>
                    <div className={styles.meta}>
                      {svc.duration_min ?? 60} min · {svc.is_active ? "Ativo" : "Inativo"}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {/* Editar */}
                    <button
                      className={styles.iconBtn}
                      onClick={() => openEdit(svc)}
                      title="Editar serviço"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                          stroke="#fff" strokeWidth="1.5" />
                      </svg>
                    </button>

                    {/* Ativar / Inativar */}
                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => confirmToggle(svc)}
                      title={svc.is_active ? "Inativar" : "Ativar"}
                    >
                     {svc.is_active ? (
                        <Eye size={18} />   // Inativar
                    ) : (
                      <EyeOff size={18} />      // Ativar
                    )}
                                        </button>
                  </div>

                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ModalNewService */}
      <ModalNewService
        tenantId={tenantId}
        show={openModal}
        mode={editingService ? "edit" : "cadastro"}
        service={editingService ?? undefined}
        onClose={() => {
          setOpenModal(false);
          setEditingService(null);
          load();
        }}
      />
    </>
  );
}
