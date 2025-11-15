import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseCleint";
import styles from "../css/ManageRoles.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

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

  // 🔥 Usuário logado
  const { profile } = useUserAndTenant();

  useEffect(() => {
    if (tenantId) loadUsers();
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
      toast.error("Erro ao carregar usuários.");
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
      toast.error("Erro ao atualizar permissão.");
      return;
    }

    toast.success("Permissão atualizada!");
    loadUsers();
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
          {users.map((u) => {
            const isSelf = u.user_id === profile?.user_id;
            const isSuperuser = u.role === "superuser";

            return (
              <div key={u.user_id} className={styles.item}>
                {/* INFO DO USUÁRIO */}
                <div className={styles.info}>
                  <strong>{u.full_name || "Sem nome"}</strong>

                  <span className={styles.roleLabel}>
                    Papel atual:{" "}
                    <b style={{ textTransform: "capitalize" }}>{u.role}</b>
                  </span>

                  {isSelf && (
                    <span className={styles.selfTag}>
                      Você não pode alterar seu próprio papel
                    </span>
                  )}

                  {isSuperuser && (
                    <span className={styles.superTag}>
                      Superuser — Não pode ser alterado
                    </span>
                  )}
                </div>

                {/* SELECT DE ALTERAÇÃO — somente se permitido */}
                {!isSelf && !isSuperuser && (
                  <select
                    className={styles.select}
                    value={u.role}
                    onChange={(e) =>
                      updateRole(
                        u.user_id,
                        e.target.value as "manager" | "professional"
                      )
                    }
                  >
                    <option value="manager">Gerente</option>
                    <option value="professional">Profissional</option>
                  </select>
                )}

                {/* Quando bloqueado */}
                {(isSelf || isSuperuser) && (
                  <select className={styles.select} disabled>
                    <option>{u.role}</option>
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
