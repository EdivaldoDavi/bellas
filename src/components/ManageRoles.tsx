import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../css/ManageRoles.module.css";

interface Props {
  tenantId: string;
}

interface ProfileUser {
  user_id: string;
  full_name: string | null;
  role: "manager" | "professional" | "superuser";
}

export default function ManageRoles({ tenantId }: Props) {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [tenantId]);

  async function loadUsers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, role")
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: "manager" | "professional") {
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
    loadUsers(); // Recarrega lista
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Gerenciar Permissões</h2>

      {loading && <p>Carregando usuários...</p>}

      {!loading && users.length === 0 && (
        <p>Nenhum usuário encontrado para este salão.</p>
      )}

      {!loading && users.length > 0 && (
        <div className={styles.list}>
          {users.map((u) => (
            <div key={u.user_id} className={styles.item}>
              <div className={styles.info}>
                <strong>{u.full_name || "Sem nome"}</strong>
                <span className={styles.roleLabel}>
                  Papel atual: <b>{u.role}</b>
                </span>
              </div>

              {/* Superuser nunca pode ser alterado */}
              {u.role !== "superuser" && (
                <select
                  className={styles.select}
                  value={u.role}
                  onChange={(e) =>
                    updateRole(u.user_id, e.target.value as "manager" | "professional")
                  }
                >
                  <option value="manager">Gerente</option>
                  <option value="professional">Profissional</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
