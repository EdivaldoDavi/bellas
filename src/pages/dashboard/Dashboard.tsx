import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import DashboardGlobal from "./DashboardGlobal";
import DashboardTenant from "./DashboardTenant";
import {  Navigate } from "react-router-dom";


export default function Dashboard() {
  const { loading, profile } = useUserAndTenant(); // Incluído tenant aqui

  const role = profile?.role;
  const hasTenant = !!profile?.tenant_id;

  // 🔄 Loading SEM desmontar
  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Carregando informações…
      </div>
    );
  }

  // ❌ Profile ausente
  if (!profile) {
    return (
      <p style={{ textAlign: "center", padding: 20, color: "red" }}>
        Acesso negado: Perfil não encontrado.
      </p>
    );
  }

  // OWNER
  if (role === "owner") {
    return <DashboardGlobal />;
  }

  // MANAGER
  if (role === "manager") {
    if (!hasTenant) {
      // só redireciono quando loading já é false
      return <Navigate to="/setup" replace />;
    }

    return (
      <>
        <DashboardTenant />
        {/* O botão 'Gerenciar Permissões' foi removido daqui */}
      </>
    );
  }

  // PROFESSIONAL
  if (role === "professional") {
    if (!hasTenant) {
      // Professional without a tenant: show a message
      return (
        <p style={{ textAlign: "center", padding: 20 }}>
          Você é um profissional e precisa ser associado a um salão para ver seu dashboard.
          Por favor, entre em contato com o administrador do sistema.
        </p>
      );
    }
    return <DashboardTenant />;
  }

  // STAFF
  if (role === "staff") {
    return (
      <p style={{ textAlign: "center", padding: 20 }}>
        Você não possui acesso ao painel administrativo.
      </p>
    );
  }

  // CLIENT
  if (role === "client") {
    return (
      <p style={{ textAlign: "center", padding: 20 }}>
        Clientes não possuem acesso ao painel administrativo.
      </p>
    );
  }

  return (
    <p style={{ textAlign: "center", padding: 20, color: "red" }}>
      Papel inválido.
    </p>
  );
}