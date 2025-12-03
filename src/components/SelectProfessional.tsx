import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from "../lib/supabaseCleint";
import { Plus, MessageCircle, Phone } from "lucide-react"; // Adicionado MessageCircle e Phone
import styles from "../css/SelectProfessional.module.css";
import { dbPhoneToMasked, onlyDigits } from "../utils/phoneUtils"; // Importar dbPhoneToMasked e onlyDigits

interface Professional {
  id: string;
  name: string;
  phone: string | null; // Adicionado phone para exibir e usar nos ícones
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
      .select("id,name,phone") // Incluído 'phone' na seleção
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
        className={styles.searchInput}
        placeholder="Buscar profissional..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.listBox}>
        {filtered.length === 0 && (
          <div className={styles.empty}>Nenhum profissional encontrado</div>
        )}

        {filtered.map((p) => (
          <div
            key={p.id}
            className={`${styles.item} ${
              value === p.id ? styles.itemSelected : ""
            }`}
            onClick={() => onChange(p.id)}
          >
            <img
              src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(
                p.name
              )}`}
              className={styles.avatar}
              alt={`Avatar de ${p.name}`}
            />

            <div className={styles.info}>
              <div className={styles.name}>{p.name}</div>
              <div className={styles.phoneRow}> {/* Novo wrapper para telefone e ícones */}
                <div className={styles.phone}>
                  📞 {dbPhoneToMasked(p.phone ?? "") || "Sem telefone"}
                </div>
                <div className={styles.actionIcons}> {/* Container para os novos ícones */}
                  {p.phone && (
                    <>
                      <button
                        className={styles.iconButton}
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que o clique selecione o item da lista
                          window.open(`https://wa.me/55${onlyDigits(p.phone || '')}`, '_blank');
                        }}
                        title="Enviar mensagem WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button
                        className={styles.iconButton}
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que o clique selecione o item da lista
                          window.location.href = `tel:${onlyDigits(p.phone || '')}`;
                        }}
                        title="Ligar para o profissional"
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

      <button className={styles.addBtn} onClick={onAdd}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export default forwardRef(SelectProfessionalComponent);