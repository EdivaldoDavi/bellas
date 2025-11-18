// src/pages/ServicosPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { X, Edit2, Trash2, Plus } from "lucide-react";

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

  const brandColor = tenant?.primary_color || "#22c55e"; // fallback verde

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [openNewModal, setOpenNewModal] = useState(false);

  useEffect(() => {
    if (tenantId) load();
  }, [tenantId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("id,name,duration_min,is_active")
      .eq("tenant_id", tenantId)
      .order("name");

    setServices((data || []) as Service[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return services;
    return services.filter((s) => s.name.toLowerCase().includes(t));
  }, [search, services]);

  async function handleToggle(service: Service) {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id)
      .eq("tenant_id", tenantId);

    if (!error) {
      setServices((old) =>
        old.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
  }

  function close() {
    navigate(-1);
  }

  return (
    <>
      <div className={styles.overlay} onClick={close}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
            onClick={() => setOpenNewModal(true)}
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
            {loading && (
              <div className={styles.empty}>Carregando...</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className={styles.empty}>Nenhum serviço encontrado.</div>
            )}

            {!loading &&
              filtered.map((svc) => (
                <div key={svc.id} className={styles.card}>
                  <div>
                    <div className={styles.title}>{svc.name}</div>
                    <div className={styles.meta}>
                      {svc.duration_min ?? 60} min ·{" "}
                      {svc.is_active ? "Ativo" : "Inativo"}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.iconBtn}>
                      <Edit2 size={18} />
                    </button>

                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => handleToggle(svc)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Modal de novo serviço */}
      <ModalNewService
        tenantId={tenantId}
        mode="cadastro"
        show={openNewModal}
        onClose={() => {
          setOpenNewModal(false);
          load();
        }}
      />
    </>
  );
}
