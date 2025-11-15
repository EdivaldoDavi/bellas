import ManageRoles from "../components/ManageRoles";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

export default function GerenciarAcessosPage() {
  const { profile } = useUserAndTenant();

  if (!profile) return null;

  // Somente superuser e manager podem acessar
  if (profile.role !== "manager" && profile.role !== "superuser") {
    return <p style={{ padding: 20, textAlign: "center" }}>Acesso negado.</p>;
  }

  return <ManageRoles tenantId={profile.tenant_id} />;
}
