// src/pages/ServicosPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { X, Edit2, Trash2, Plus } from "lucide-react";
import styles from "../css/ServicosModal.module.css";
import ModalNewService from "../components/ModalNewService";

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
  is_active: boolean; // ajuste se no seu schema o nome for outro
};

export default function ServicosPage() {
  const navigate = useNavigate();
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [openNewModal, setOpenNewModal] = useState(false);
  // no futuro podemos ter um state para edição:
  // const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    load();
  }, [tenantId]);

  async function load() {
    if (!tenantId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("services")
      .select("id, name, duration_min, is_active")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      console.error("Erro ao carregar serviços", error);
    } else {
      setServices((data || []) as Service[]);
    }

    setLoading(false);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;
    return services.filter((s) => s.name.toLowerCase().includes(term));
  }, [services, search]);

  async function handleToggleActive(service: Service) {
    const newValue = !service.is_active;

    const { error } = await supabase
      .from("services")
      .update({ is_active: newValue })
      .eq("id", service.id)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Erro ao atualizar status", error);
      return;
    }

    setServices((old) =>
      old.map((s) =>
        s.id === service.id ? { ...s, is_active: newValue } : s
      )
    );
  }

  function handleClose() {
    // volta para a rota anterior; se quiser travar, use navigate("/dashboard")
    navigate(-1);
  }

  return (
    <>
      {/* overlay com cara de modal */}
      <div className={styles.overlay} onClick={handleClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <header className={styles.header}>
            <h2>Serviços</h2>
            <button className={styles.iconBtn} onClick={handleClose}>
              <X size={20} />
            </button>
          </header>

          <div className={styles.toolbar}>
            <input
              className={styles.search}
              placeholder="Buscar serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              className={styles.primaryBtn}
              onClick={() => setOpenNewModal(true)}
            >
              <Plus size={18} />
              <span>Novo serviço</span>
            </button>
          </div>

          <div className={styles.listWrapper}>
            {loading && <div className={styles.empty}>Carregando...</div>}

            {!loading && filtered.length === 0 && (
              <div className={styles.empty}>Nenhum serviço encontrado.</div>
            )}

            {!loading &&
              filtered.map((svc) => (
                <div key={svc.id} className={styles.row}>
                  <div className={styles.info}>
                    <div className={styles.name}>{svc.name}</div>
                    <div className={styles.meta}>
                      {svc.duration_min ?? 60} min ·{" "}
                      {svc.is_active ? "Ativo" : "Inativo"}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.iconBtn}
                      // onClick={() => setEditingService(svc)}
                      onClick={() => {
                        // aqui depois podemos abrir ModalNewService em modo edição
                        console.log("editar serviço", svc.id);
                      }}
                    >
                      <Edit2 size={18} />
                    </button>

                    <button
                      className={`${styles.iconBtn} ${
                        svc.is_active ? styles.danger : ""
                      }`}
                      title={
                        svc.is_active ? "Inativar serviço" : "Reativar serviço"
                      }
                      onClick={() => handleToggleActive(svc)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* modal de novo serviço reaproveitando o que você já tem */}
      <ModalNewService
        tenantId={tenantId}
        mode="cadastro"
        show={openNewModal}
        onClose={() => {
          setOpenNewModal(false);
          load(); // recarrega lista depois de criar
        }}
      />
    </>
  );
}
