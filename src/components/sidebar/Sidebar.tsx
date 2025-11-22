import { NavLink } from "react-router-dom";
import { type ReactNode, type CSSProperties } from "react";

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Calendar,
  Settings,
  User,
 
  LogOut,
  MessageCircle,
  ShieldCheck,
  Users,
  Scissors,
  UserCog,
  UserPlus,
  Percent, // Importar o ícone de porcentagem para comissões
} from "lucide-react";

import { logout } from "../../lib/supabaseCleint";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";

import styles from "../../css/Sidebar.module.css";

export default function Sidebar({
  isOpen,
  toggleSidebar,
  closeSidebar,
}: {
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}) {
  const { profile, tenant, loading } = useUserAndTenant();

  // 🚨 DEBUG: Log do perfil e tenant na Sidebar
  console.log("Sidebar: profile", profile);
  console.log("Sidebar: tenant", tenant);
  console.log("Sidebar: loading", loading);

  // Enquanto carrega → evita renderização incompleta
  if (loading || !profile) {
    return null;
  }

  const role = profile.role ?? "professional";

  const sidebarPrimary =
    tenant?.primary_color?.trim() || "#FF4081";

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 1024;

  type MenuItem = { to: string; label: string; icon: ReactNode };

  let menu: MenuItem[] = [];

  /* ==========================
        1 — SEM TENANT (modo global)
     ========================== */
  if (!tenant) {
    menu = [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { to: "/saloes", label: "Salões", icon: <Building2 size={20} /> },
      { to: "/assinaturas", label: "Assinaturas", icon: <CreditCard size={20} /> },
      { to: "/gerenciar-acessos", label: "Gerenciar Acessos", icon: <ShieldCheck size={20} /> },
      { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} /> },
      { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
    ];
  }

  /* ==========================
        2 — OWNER / MANAGER
     ========================== */
  else if (role === "owner" || role === "manager") {
    menu = [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },

      { to: "/clientes", label: "Clientes", icon: <Users size={20} /> },
      { to: "/servicos", label: "Serviços", icon: <Scissors size={20} /> },
      { to: "/profissionais", label: "Profissionais", icon: <UserCog size={20} /> },
      { to: "/usuarios", label: "Usuários", icon: <UserPlus size={20} /> },

      { to: "/gerenciar-acessos", label: "Gerenciar Acessos", icon: <ShieldCheck size={20} /> },
      { to: "/config", label: "Configurações", icon: <Settings size={20} /> },
      { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} /> },
      { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
    ];
  }

  /* ==========================
        3 — PROFISSIONAL
        Agora com 3 opções:
        ✔ Dashboard do profissional
        ✔ Agenda
        ✔ Meu Perfil
     ========================== */
  else {
    menu = [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },
      { to: "/commissions", label: "Minhas Comissões", icon: <Percent size={20} /> }, // Adicionado Minhas Comissões
      { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
    ];
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {isMobile && isOpen && (
        <div className={styles.overlay} onClick={closeSidebar} />
      )}

      <aside
        className={`${styles.sidebar} ${
          isMobile
            ? isOpen
              ? styles.open
              : styles.collapsed
            : isOpen
            ? ""
            : styles.collapsed
        }`}
        style={{ "--sidebar-primary": sidebarPrimary } as CSSProperties}
      >
        <div className={styles.topSection}>
          <span className={styles.logo}>NailUp!</span>
          <button className={styles.toggleBtn} onClick={toggleSidebar}>
            ☰
          </button>
        </div>

        <nav className={styles.menu}>
          {menu.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `${styles.menuItem} ${isActive ? styles.active : ""}`
              }
              onClick={() => {
                if (isMobile) closeSidebar();
              }}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <button className={styles.menuItem} onClick={handleLogout}>
            <span className={styles.icon}>
              <LogOut size={20} />
            </span>
            <span className={styles.label}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}