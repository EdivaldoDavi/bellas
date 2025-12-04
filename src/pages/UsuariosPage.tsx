import { useState } from "react";
import ModalNewUser from "../components/ModalNewUser";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/UsuariosPage.module.css"; // Importar o CSS para a página
import { useLocation, useNavigate } from "react-router-dom"; // Adicionado useLocation e useNavigate

export default function UsuariosPage() {
  const { tenant } = useUserAndTenant();
  const [showNewUserModal, setShowNewUserModal] = useState(false); // Alterado para false
  const navigate = useNavigate();
  const location = useLocation(); // Obter o objeto location

  // The 'close' function is removed as the page is no longer a modal.
  // Navigation is now handled by the sidebar.

  return (
    <div className={styles.container}> {/* Aplicar estilo de container */}
      <h2 className={styles.title}>Usuários</h2> {/* Aplicar estilo de título */}
      <p className={styles.description}>Gerencie os usuários do seu Studio.</p> {/* Aplicar estilo de descrição */}

      <button
        type="button"
        onClick={() => setShowNewUserModal(true)}
        className={styles.newUserButton} // Aplicar estilo de botão
      >
        Convidar Novo Usuário
      </button>

      <ModalNewUser
        tenantId={tenant?.id}
        show={showNewUserModal}
        onClose={() => setShowNewUserModal(false)}
      />
    </div>
  );
}