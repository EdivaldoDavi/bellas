import { useEffect, useState  } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../css/ManageRoles.module.css";
import { Plus } from "lucide-react"; // Importar ícone Plus

interface Props {
  tenantId?: string;
  loggedInUserId: string; // Adicionando o ID do usuário logado
}

interface ProfileUser {
  user_id: string;
  full_name: string | null;
  role: "manager" | "professional" | "superuser";
  created_at: string; // Adicionado para ordenação
}

export default function ManageRoles({ tenantId, loggedInUserId }: Props) {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAllUsers, setShowAllUsers] = useState(false);

  useEffect(() => {
    if (tenantId) loadUsers();
  }, [tenantId, search, showAllUsers]); // Adicionado search e showAllUsers como dependências

  async function loadUsers() {
    setLoading(true);

    let query = supabase
      .from("profiles")
      .select("user_id, full_name, role, created_at")
      .eq("tenant_id", tenantId);

    const searchTerm = search.trim();

    if (searchTerm) {
      // Se houver termo de busca, pesquisa em nome
      query = query.ilike("full_name", `%${searchTerm}%`);
      query = query.order("full_name", { ascending: true }); // Ordena por nome ao buscar
    } else if (!showAllUsers) {
      // Se não houver termo de busca e não estiver no modo 'Ver todos', carrega os 3 mais recentes
      query = query.order("created_at", { ascending: false }).limit(3);
    } else {
      // Se não houver termo de busca e estiver no modo 'Ver todos', ordena por nome
      query = query.order("full_name", { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

  async function performRoleUpdate(userId: string, newRole: "manager" | "professional") {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      toast.error("Erro ao atualizar permissão");
      return;
    }

    toast.success("Permissão atualizada!");
    loadUsers();
  }

  function confirmRoleUpdate(user: ProfileUser, newRole: "manager" | "professional") {
    // Impedir alteração da própria role
    if (user.user_id === loggedInUserId) {
      toast.error("Você não pode alterar sua própria permissão.");
      return;
    }

    // Impedir alteração de superuser
    if (user.role === "superuser") {
      toast.error("Não é possível alterar a permissão de um superuser.");
      return;
    }

    toast(
      ({ closeToast }) => (
        <div style={{ textAlign: "center", padding: '10px' }}>
          <p style={{ marginBottom: 12, fontSize: '0.95rem' }}>
            Deseja realmente alterar a permissão de <b>{user.full_name}</b> para <b>{newRole === 'manager' ? 'Gerente' : 'Profissional'}</b>?
          </p>

          <button
            onClick={() => {
              closeToast?.();
              performRoleUpdate(user.user_id, newRole);
            }}
            style={{
              marginRight: 10,
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Confirmar
          </button>

          <button
            onClick={closeToast}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--separator)",
              color: "var(--text)",
              border: "1px solid var(--separator)",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Cancelar
          </button>
        </div>
      ),
      {
        autoClose: false,
        draggable: false,
        icon: false,
        closeOnClick: false,
        style: { background: "var(--card-bg)", color: "var(--text)", borderRadius: '12px' }
      }
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Gerenciar Permissões</h2>

      <input
        type="text"
        placeholder="Buscar usuário por nome..."
        className={styles.searchInput}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className={styles.loading}>Carregando usuários...</p>}

      {!loading && users.length === 0 && (
        <p className={styles.empty}>Nenhum usuário encontrado para este Studio.</p>
      )}

      {!loading && users.length > 0 && (
        <div className={styles.list}>
          {users.map((u) => {
            const isSelf = u.user_id === loggedInUserId;
            const isSuperuser = u.role === "superuser";

            return (
              <div key={u.user_id} className={styles.item}>
                <div className={styles.info}>
                  <strong>{u.full_name || "Sem nome"}</strong>
                  <span className={styles.roleLabel}>
                    Papel atual: <b>{u.role}</b>
                  </span>
                </div>

                {isSuperuser ? (
                  <span className={styles.superuser}>Superuser (bloqueado)</span>
                ) : isSelf ? (
                  <span className={styles.self}>Você não pode alterar seu próprio papel</span>
                ) : (
                  <select
                    className={styles.select}
                    value={u.role}
                    onChange={(e) =>
                      confirmRoleUpdate(
                        u, // Passa o objeto de usuário completo
                        e.target.value as "manager" | "professional"
                      )
                    }
                  >
                    <option value="manager">Gerente</option>
                    <option value="professional">Profissional</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!showAllUsers && users.length === 3 && !search.trim() && (
        <button
          className={styles.viewAllButton}
          onClick={() => setShowAllUsers(true)}
        >
          <Plus size={18} /> Ver todos os usuários
        </button>
      )}
    </div>
  );
}