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
  onChange: (id: string) => void;
  onAdd: () => void;
}

// ✅ Agora com forwardRef para expor reload()
const SelectClientWhatsApp = forwardRef(function SelectClientWhatsApp(
  { tenantId, value, onChange, onAdd }: Props,
  ref
) {
  const [list, setList] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadInitial();
  }, [tenantId]);

  async function loadInitial() {
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("id,full_name,customer_phone")
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true })
      .limit(10);

    setList(data || []);
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

  // ✅ Função para recarregar após criar cliente
async function reload(selectId?: string) {
  const { data } = await supabase
    .from("customers")
    .select("id,full_name,customer_phone")
    .eq("tenant_id", tenantId)
    .order("full_name", { ascending: true });

  let listData = data || [];

  // ✅ Se um novo id foi passado, mova ele para o topo
  if (selectId) {
    const selectedItem = listData.find(c => c.id === selectId);
    if (selectedItem) {
      listData = [
        selectedItem,
        ...listData.filter(c => c.id !== selectId)
      ];
    }

    // Seleciona automaticamente no form
    onChange(selectId);
    setSearch(""); // limpa busca para mostrar lista completa
  }

  setList(listData);
}

  // ✅ disponibiliza método reload para o componente pai
  useImperativeHandle(ref, () => ({ reload }));

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
            onClick={() => onChange(c.id)}
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
