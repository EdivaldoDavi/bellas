import { useState } from "react";
import ModalNewUser from "../components/ModalNewUser";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/UsuariosPage.module.css"; // Importar o CSS para a página

export default function UsuariosPage() {
  const { tenant } = useUserAndTenant();
  const [showNewUserModal, setShowNewUserModal] = useState(false); // Alterado para false

  return (
    <div className={styles.container}> {/* Aplicar estilo de container */}
      <h2 className={styles.title}>Usuários</h2> {/* Aplicar estilo de título */}
      <p className={styles.description}>Gerencie os usuários do seu salão.</p> {/* Aplicar estilo de descrição */}

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