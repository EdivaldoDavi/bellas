import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import DashboardGlobal from "./DashboardGlobal";
import DashboardTenant from "./DashboardTenant";

import { Link } from "react-router-dom";

export default function Dashboard() {
  const { loading, profile } = useUserAndTenant();

  // Enquanto carrega perfil / sessão
  {loading ? "Carregando..." : "Carregando perfil"}

  // Caso não haja perfil
  if (!profile) {
    return (
      <p style={{ textAlign: "center", padding: 20, color: "red" }}>
        Acesso negado: Perfil não encontrado.
      </p>
    );
  }

  const role = profile.role; // superuser | manager | professional

  // 🔥 superuser → dashboard global
  if (role === "superuser") {
    return <DashboardGlobal />;
  }

  // 🔥 manager → dashboard da tenant + acesso a permissões
  if (role === "manager") {
    return (
      <div>
        <DashboardTenant />

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            to="/permissions"
            style={{
              padding: "10px 16px",
              background: "var(--color-primary)",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Gerenciar Permissões
          </Link>
        </div>
      </div>
    );
  }

  // 🔥 professional → dashboard da tenant
  if (role === "professional") {
    return <DashboardTenant />;
  }

  return (
    <p style={{ textAlign: "center", padding: 20, color: "red" }}>
      Acesso negado: papel inválido.
    </p>
  );
}
