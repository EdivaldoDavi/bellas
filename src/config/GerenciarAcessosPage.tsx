import ManageRoles from "../components/ManageRoles";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/GerenciarAcessosPage.module.css"; // Importar o novo CSS
import { useLocation, useNavigate } from "react-router-dom"; // Adicionado useLocation e useNavigate

export default function GerenciarAcessosPage() {
  const { profile } = useUserAndTenant();
  const navigate = useNavigate();
  const location = useLocation(); // Obter o objeto location

  // The 'close' function is removed as the page is no longer a modal.
  // Navigation is now handled by the sidebar.

  // Carregando ou sem sessão
  if (!profile) {
    return <p className={styles.description} style={{ padding: 20, textAlign: "center" }}>Carregando...</p>;
  }

  // 🔥 Apenas OWNER e MANAGER podem acessar esta página
  const role = profile.role;
  const canAccess = role === "owner" || role === "manager";

  if (!canAccess) {
    return (
      <p className={styles.description} style={{ padding: 20, textAlign: "center", color: "red" }}>
        Acesso negado.
      </p>
    );
  }

  // 🔥 Segurança adicional — profile.tenant_id pode ser null no TS
  if (!profile.tenant_id) {
    return (
      <p className={styles.description} style={{ padding: 20, textAlign: "center", color: "red" }}>
        Nenhuma tenant associada ao usuário.
      </p>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Gerenciar Permissões</h2>
      <p className={styles.description}>Defina os papéis e permissões dos usuários do seu Studio.</p>
      <ManageRoles tenantId={profile.tenant_id} loggedInUserId={profile.user_id} />
    </div>
  );
}