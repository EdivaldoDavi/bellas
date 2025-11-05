import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from "../lib/supabaseCleint";
import { Plus } from "lucide-react";
import styles from "../css/SelectProfessional.module.css";

interface Professional {
  id: string;
  name: string;
}

interface Props {
  tenantId: string;
  value: string;
  onChange: (id: string) => void;
  onAdd: () => void;
  newProfessionalId?: string | null;
}

function SelectProfessionalComponent(
  { tenantId, value, onChange, onAdd, newProfessionalId }: Props,
  ref: any
) {
  const [list, setList] = useState<Professional[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (tenantId) load();
  }, [tenantId]);

  useEffect(() => {
    if (newProfessionalId) {
      load(newProfessionalId);
    }
  }, [newProfessionalId]);

  async function load(selectId?: string) {
    const { data } = await supabase
      .from("professionals")
      .select("id,name")
      .eq("tenant_id", tenantId)
      .order("name");

    let arr = data || [];

    if (selectId) {
      const p = arr.find(x => x.id === selectId);
      if (p) {
        arr = [p, ...arr.filter(x => x.id !== selectId)];
        onChange(p.id);
      }
    }

    setList(arr);
  }

  useImperativeHandle(ref, () => ({
    reload: (id?: string) => load(id)
  }));

  const filtered = list.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.wrap}>
      <input
        className={styles.search}
        placeholder="Buscar profissional..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione...</option>
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <button className={styles.addBtn} onClick={onAdd}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export default forwardRef(SelectProfessionalComponent);
