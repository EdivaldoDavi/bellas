import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import DashboardGlobal from "./DashboardGlobal";
import DashboardTenant from "./DashboardTenant";
import { Link, Navigate } from "react-router-dom";

export default function Dashboard() {
  const { loading, profile } = useUserAndTenant();

  // 🔄 LOADING
  if (loading) {
    return (
      <p style={{ textAlign: "center", padding: 20 }}>
        Carregando informações...
      </p>
    );
  }

  // ❌ SEM PROFILE
  if (!profile) {
    return (
      <p style={{ textAlign: "center", padding: 20, color: "red" }}>
        Acesso negado: Perfil não encontrado.
      </p>
    );
  }

  const role = profile.role; // superuser | manager | professional | staff | client
  const hasTenant = !!profile.tenant_id;

  // ---------------------------------------------------------
  // SUPERUSER
  // ---------------------------------------------------------
  if (role === "superuser") {
    return <DashboardGlobal />;
  }

  // ---------------------------------------------------------
  // MANAGER
  // ---------------------------------------------------------
  if (role === "manager") {
    // Primeira vez → ainda não tem tenant → redirecionar para SETUP
    if (!hasTenant) {
      return <Navigate to="/setup" replace />;
    }

    // Manager com tenant → dashboard e permissões
    return (
      <div>
        <DashboardTenant />

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            to="/gerenciar-acessos"
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

  // ---------------------------------------------------------
  // PROFESSIONAL
  // ---------------------------------------------------------
  if (role === "professional") {
    if (!hasTenant) {
      // só por segurança — normalmente nunca acontece
      return <Navigate to="/setup" replace />;
    }

    return <DashboardTenant />;
  }

  // ---------------------------------------------------------
  // STAFF
  // ---------------------------------------------------------
  if (role === "staff") {
    return (
      <p style={{ textAlign: "center", padding: 20 }}>
        Você não possui acesso ao painel administrativo.
      </p>
    );
  }

  // ---------------------------------------------------------
  // CLIENT
  // ---------------------------------------------------------
  if (role === "client") {
    return (
      <p style={{ textAlign: "center", padding: 20 }}>
        Clientes não possuem acesso ao painel administrativo.
      </p>
    );
  }

  // ---------------------------------------------------------
  // FALLBACK (nunca deve acontecer)
  // ---------------------------------------------------------
  return (
    <p style={{ textAlign: "center", padding: 20, color: "red" }}>
      Acesso negado: papel inválido.
    </p>
  );
}
