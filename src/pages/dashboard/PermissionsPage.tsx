import ManageRoles from "../../components/ManageRoles";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";

export default function PermissionsPage() {
  const { profile } = useUserAndTenant();

  if (!profile || profile.role !== "manager") {
    return (
      <p style={{ textAlign: "center", padding: 20, color: "red" }}>
        Acesso negado.
      </p>
    );
  }

  return <ManageRoles tenantId={profile.tenant_id} />;
}
