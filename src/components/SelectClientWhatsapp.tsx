import {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
  onChange: (id: string, name: string) => void;
  onAdd: () => void;
  newClientId?: string | null;
  hideAddButton?: boolean; // 🔥 permite esconder o botão interno
}

export interface SelectClientRef {
  reload: (id?: string) => void;
}

function SelectClientComponent(
  { tenantId, value, onChange, onAdd, newClientId, hideAddButton = false }: Props,
  ref: any
) {
  const [list, setList] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  /* ----------------------- LOAD INICIAL ----------------------- */
  useEffect(() => {
    if (tenantId) load();
  }, [tenantId]);

  /* ----------- Selecionar o novo cliente criado ----------- */
  useEffect(() => {
    if (newClientId) load(newClientId);
  }, [newClientId]);

  /* ----------------------- RELOAD VIA REF ----------------------- */
  useImperativeHandle(ref, () => ({
    reload: (id?: string) => load(id),
  }));

  async function load(selectId?: string) {
    setLoading(true);

    const { data } = await supabase
      .from("customers")
      .select("id, full_name, customer_phone")
      .eq("tenant_id", tenantId)
      .order("full_name");

    let customers = data || [];

    // 🔥 Se foi criado agora → coloca primeiro na lista
    if (selectId) {
      const selected = customers.find((c) => c.id === selectId);
      if (selected) {
        customers = [selected, ...customers.filter((c) => c.id !== selectId)];
        onChange(selected.id, selected.full_name);
      }
    }

    setList(customers);
    setLoading(false);
  }

  /* ----------------------- SEARCH ----------------------- */
  async function handleSearch(text: string) {
    setSearch(text);
    if (text.trim().length < 2) return;

    setLoading(true);

    const { data } = await supabase
      .from("customers")
      .select("id, full_name, customer_phone")
      .eq("tenant_id", tenantId)
      .or(
        `full_name.ilike.%${text}%,customer_phone.ilike.%${text}%`
      )
      .order("full_name")
      .limit(40);

    setList(data || []);
    setLoading(false);
  }

  /* ----------------------- FILTRO LOCAL ----------------------- */
  const filtered = list.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  /* ----------------------------- RENDER ----------------------------- */
  return (
    <div className={styles.wrap}>
      {/* 🔍 Busca */}
      <input
        className={styles.search}
        placeholder="Digite nome ou telefone..."
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div className={styles.listBox}>
        {loading && (
          <div className={styles.loading}>Carregando...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>Nenhum cliente encontrado</div>
        )}

        {filtered.map((c) => (
          <div
            key={c.id}
            className={`${styles.item} ${
              value === c.id ? styles.selected : ""
            }`}
            onClick={() => onChange(c.id, c.full_name)}
          >
            <img
              src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(
                c.full_name
              )}`}
              className={styles.avatar}
            />

            <div className={styles.info}>
              <div className={styles.name}>{c.full_name}</div>
              <div className={styles.phone}>
                {c.customer_phone || "Sem telefone"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔥 Botão interno removível */}
      {!hideAddButton && (
        <button className={styles.addBtn} onClick={onAdd}>
          <Plus size={18} />
          Novo Cliente
        </button>
      )}
    </div>
  );
}

export default forwardRef(SelectClientComponent);
