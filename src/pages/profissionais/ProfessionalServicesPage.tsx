import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { X } from "lucide-react";

import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import { supabase } from "../../lib/supabaseCleint";
import styles from "../../css/ModalSelectServiceForProfessional.module.css";

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
};

export default function ProfessionalServicesPage() {
  const { tenant } = useUserAndTenant();
  const tenantId = tenant?.id;
  const { id: professionalId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const returnTo = searchParams.get("returnTo") || (professionalId ? `/profissionais/edit/${professionalId}` : "/profissionais");

  const [services, setServices] = useState<Service[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tenantId || !professionalId) return;
    (async () => {
      setLoading(true);

      const { data: svc, error: svcErr } = await supabase
        .from("services")
        .select("id,name,duration_min")
        .eq("tenant_id", tenantId)
        .order("name");

      if (svcErr) {
        toast.error("Erro ao carregar serviços");
        setLoading(false);
        return;
      }

      const { data: links, error: linksErr } = await supabase
        .from("professional_services")
        .select("service_id")
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (linksErr) {
        toast.error("Erro ao carregar seleção atual");
        setLoading(false);
        return;
      }

      setServices(svc || []);
      setSelectedIds((links || []).map((l: any) => l.service_id));
      setLoading(false);
    })();
  }, [tenantId, professionalId]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return services;
    return services.filter((x) => x.name.toLowerCase().includes(s));
  }, [services, search]);

  const allSelected = services.length > 0 && selectedIds.length === services.length;

  function toggleId(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : services.map((s) => s.id));
  }

  async function save() {
    if (!tenantId || !professionalId) return;

    await supabase
      .from("professional_services")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("professional_id", professionalId);

    if (selectedIds.length > 0) {
      await supabase
        .from("professional_services")
        .insert(
          selectedIds.map((sid) => ({
            tenant_id: tenantId,
            professional_id: professionalId,
            service_id: sid,
          }))
        );
    }

    toast.success("Serviços atualizados!");
    const url = new URL(window.location.origin + returnTo);
    url.searchParams.set("refreshProfessional", "1");
    navigate(url.pathname + url.search, { replace: true });
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Selecionar serviços</h3>
          <button className={styles.closeBtn} onClick={() => navigate(returnTo)}>
            <X size={18} />
          </button>
        </div>

        <input
          className={styles.item}
          style={{ gridTemplateColumns: "1fr" }}
          placeholder="Buscar serviço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className={styles.list}>
            <div className={styles.item} style={{ justifyItems: "center" }}>Carregando...</div>
          </div>
        ) : (
          <div className={styles.list}>
            <label className={styles.item} onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span className={styles.name}>Selecionar todos</span>
              <span className={styles.duration}></span>
            </label>

            {filtered.map((s) => (
              <label key={s.id} className={styles.item} onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleId(s.id)} />
                <span className={styles.name}>{s.name}</span>
                <span className={styles.duration}>{s.duration_min ? `${s.duration_min} min` : ""}</span>
              </label>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={() => navigate(returnTo)}>Cancelar</button>
          <button className={styles.saveBtn} onClick={save}>Salvar seleção</button>
        </div>
      </div>
    </div>
  );
}