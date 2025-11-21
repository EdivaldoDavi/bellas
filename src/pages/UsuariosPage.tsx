import { useState } from "react";
import ModalNewUser from "../components/ModalNewUser";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

export default function UsuariosPage() {
  const { tenant } = useUserAndTenant();
  const [showUsersModal, setShowUsersModal] = useState(false); // Abre apenas ao clicar no botão

  return (
    <div style={{ padding: "1.5rem" }}>
      <h2>Usuários</h2>
      <p>Gerencie os usuários do seu salão.</p>

      <button
        type="button"
        onClick={() => setShowUsersModal(true)}
        style={{
          marginTop: "1rem",
          padding: "8px 14px",
          borderRadius: 8,
          border: "none",
          background: "var(--color-primary)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Convidar Novo Usuário
      </button>

      <ModalNewUser
        tenantId={tenant?.id}
        show={showUsersModal}
        onClose={() => setShowUsersModal(false)}
      />
    </div>
  );
}