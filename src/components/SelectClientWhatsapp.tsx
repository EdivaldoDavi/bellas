import {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { supabase } from "../lib/supabaseCleint";
import { Plus, MessageCircle, Phone, User } from "lucide-react"; // Adicionado User
import styles from "../css/SelectClientWhatsapp.module.css";
import { dbPhoneToMasked, onlyDigits } from "../utils/phoneUtils"; // Importar dbPhoneToMasked e onlyDigits
import LoadingSpinner from "./LoadingSpinner";

interface Client {
  id: string;
  full_name: string;
  customer_phone: string;
}

interface Props {
  tenantId: string;
  value: string;
  onChange: (id: string, name: string) => void | Promise<void>; // <--- CORRIGIDO AQUI
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
        className={styles.searchInput}
        placeholder="Digite nome ou telefone..."
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
      />

      <div className={styles.listBox}>
        {loading && <LoadingSpinner />}

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
            <div className={styles.avatarIcon}> {/* Usar uma div para o ícone */}
              <User size={24} />
            </div>

            <div className={styles.info}>
              <div className={styles.name}>{c.full_name}</div>
              <div className={styles.phoneRow}> {/* Novo wrapper para telefone e ícones */}
                <div className={styles.phone}>
                  📞 {dbPhoneToMasked(c.customer_phone || "") || "Sem telefone"}
                </div>
                <div className={styles.actionIcons}> {/* Container para os novos ícones */}
                  {c.customer_phone && (
                    <>
                      <button
                        className={styles.iconButton}
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que o clique selecione o item da lista
                          window.open(`https://wa.me/55${onlyDigits(c.customer_phone)}`, '_blank');
                        }}
                        title="Enviar mensagem WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button
                        className={styles.iconButton}
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que o clique selecione o item da lista
                          window.location.href = `tel:${onlyDigits(c.customer_phone)}`;
                        }}
                        title="Ligar para o cliente"
                      >
                        <Phone size={18} />
                      </button>
                    </>
                  )}
                </div>
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