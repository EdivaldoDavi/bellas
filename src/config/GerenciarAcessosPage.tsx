
import ManageRoles from "../components/ManageRoles";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

export default function GerenciarAcessosPage() {
  const { profile } = useUserAndTenant();

  // Carregando ou sem sessão
  if (!profile) {
    return <p style={{ padding: 20, textAlign: "center" }}>Carregando...</p>;
  }

  // 🔥 Apenas OWNER e MANAGER podem acessar esta página
  const role = profile.role;
  const canAccess = role === "owner" || role === "manager";

  if (!canAccess) {
    return (
      <p style={{ padding: 20, textAlign: "center", color: "red" }}>
        Acesso negado.
      </p>
    );
  }

  // 🔥 Segurança adicional — profile.tenant_id pode ser null no TS
  if (!profile.tenant_id) {
    return (
      <p style={{ padding: 20, textAlign: "center", color: "red" }}>
        Nenhuma tenant associada ao usuário.
      </p>
    );
  }

  return <ManageRoles tenantId={profile.tenant_id} />;
}
