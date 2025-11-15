import ManageRoles from "../../components/ManageRoles";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";

export default function PermissionsPage() {
  const { profile } = useUserAndTenant();

  // 🔐 Caso não tenha perfil → não autenticado
  if (!profile) {
    return (
      <p style={{ textAlign: "center", padding: 20, color: "red" }}>
        Acesso negado: usuário não encontrado.
      </p>
    );
  }

  // 🔐 Apenas owner ou manager podem acessar
  const allowed = profile.role === "owner" || profile.role === "manager";

  if (!allowed) {
    return (
      <p style={{ textAlign: "center", padding: 20, color: "red" }}>
        Acesso negado: você não possui permissão.
      </p>
    );
  }

  // 🔐 Tenant ID é obrigatório
  if (!profile.tenant_id) {
    return (
      <p style={{ textAlign: "center", padding: 20, color: "red" }}>
        Erro: Tenant não encontrado.
      </p>
    );
  }

  return <ManageRoles tenantId={profile.tenant_id} />;
}
