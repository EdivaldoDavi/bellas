import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from "../lib/supabaseCleint";
import { Plus } from "lucide-react";
import styles from "../css/SelectClientWhatsapp.module.css";

interface Client {
  id: string;
  full_name: string;
  customer_phone: string;
}

interface Props {
  tenantId: string;
  value: string;
  onChange: (id: string, name: string) => void; // ✅ agora também recebe nome
  onAdd: () => void;
}

export interface SelectClientRef {
  reload: (id?: string) => void;
}

const SelectClientWhatsApp = forwardRef<SelectClientRef, Props>(function SelectClientWhatsApp(
  { tenantId, value, onChange, onAdd },
  ref
) {
  const [list, setList] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ carregar lista inicial
  useEffect(() => {
    if (!tenantId) return;
    loadInitial();
  }, [tenantId]);

  // ✅ expõe reload para o pai
  useImperativeHandle(ref, () => ({
    reload: async (selectedId?: string) => {
      await loadInitial(selectedId);
    }
  }));

  async function loadInitial(selectId?: string) {
    setLoading(true);

    const { data } = await supabase
      .from("customers")
      .select("id,full_name,customer_phone")
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true })
      .limit(50);

    let listData = data || [];

    // ✅ Se cliente recém criado, coloca no topo e seleciona
    if (selectId) {
      const selected = listData.find(c => c.id === selectId);
      if (selected) {
        listData = [selected, ...listData.filter(c => c.id !== selectId)];
        onChange(selected.id, selected.full_name);
      }
    }

    setList(listData);
    setLoading(false);
  }

  async function handleSearch(text: string) {
    setSearch(text);
    if (text.length < 2) return;

    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("id,full_name,customer_phone")
      .eq("tenant_id", tenantId)
      .or(`full_name.ilike.%${text}%,customer_phone.ilike.%${text}%`)
      .order("full_name", { ascending: true })
      .limit(50);

    setList(data || []);
    setLoading(false);
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>Cliente</label>

      <input
        type="text"
        className={styles.searchInput}
        placeholder="Digite nome ou telefone..."
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div className={styles.listBox}>
        {loading && <div className={styles.loading}>Carregando...</div>}

        {!loading && list.length === 0 && (
          <div className={styles.empty}>Nenhum cliente encontrado</div>
        )}

        {list.map((c) => (
          <div
            key={c.id}
            className={`${styles.item} ${value === c.id ? styles.itemSelected : ""}`}
            onClick={() => onChange(c.id, c.full_name)}
          >
            <img
              src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(c.full_name)}`}
              alt="avatar"
              className={styles.avatar}
            />
            <div>
              <div className={styles.name}>{c.full_name}</div>
              <div className={styles.phone}>{c.customer_phone || "Sem telefone"}</div>
            </div>
          </div>
        ))}
      </div>

      <button className={styles.addButton} onClick={onAdd}>
        <Plus size={18} />
        Novo Cliente
      </button>
    </div>
  );
});

export default SelectClientWhatsApp;
