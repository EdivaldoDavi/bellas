import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from "../lib/supabaseCleint";
import { Plus } from "lucide-react";
import styles from "../css/SelectService.module.css";

interface Service {
  id: string;
  name: string;
  duration_min: number | null;
}

interface Props {
  tenantId: string;
  professionalId: string;
  value: string;
  onChange: (id: string, duration: number) => void;
  onAdd: () => void;
  newServiceId?: string | null;
}

function SelectServiceComponent(
  { tenantId, professionalId, value, onChange, onAdd, newServiceId }: Props,
  ref: any
) {
  const [list, setList] = useState<Service[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (tenantId && professionalId) load();
  }, [tenantId, professionalId]);

  useEffect(() => {
    if (newServiceId) {
      load(newServiceId);
    }
  }, [newServiceId]);

  async function load(selectId?: string) {
    const { data } = await supabase
      .from("professional_services")
      .select("service:services(id,name,duration_min)")
      .eq("tenant_id", tenantId)
      .eq("professional_id", professionalId)
      .order("service.name");

    let services = (data || []).map((r: any) => r.service);

    if (selectId) {
      const selected = services.find(s => s.id === selectId);
      if (selected) {
        services = [selected, ...services.filter(s => s.id !== selectId)];
        onChange(selected.id, selected.duration_min || 60);
      }
    }

    setList(services);
  }

  useImperativeHandle(ref, () => ({
    reload: (id?: string) => load(id)
  }));

  const filtered = list.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.wrap}>
      <input
        className={styles.search}
        placeholder="Buscar serviço..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        className={styles.select}
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          const svc = list.find((s) => s.id === id);
          onChange(id, svc?.duration_min || 60);
        }}
        disabled={!professionalId}
      >
        <option value="">Selecione...</option>
        {filtered.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.duration_min ?? 60}min
          </option>
        ))}
      </select>

      <button className={styles.addBtn} onClick={onAdd}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export default forwardRef(SelectServiceComponent);
