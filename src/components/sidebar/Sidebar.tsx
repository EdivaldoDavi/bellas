import { NavLink } from "react-router-dom";
import { type ReactNode, type CSSProperties } from "react";

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Calendar,
  Settings,
  User,
  BadgeDollarSign,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Users,
  Scissors,
  UserCog,
  UserPlus,
} from "lucide-react";

import { logout } from "../../lib/supabaseCleint";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";

import styles from "../../css/Sidebar.module.css";

/* ================================
   COMPONENT
===================================*/
export default function Sidebar({
  isOpen,
  toggleSidebar,
  closeSidebar,
}: {
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}) {
  const { profile, tenant } = useUserAndTenant();

  const role = profile?.role ?? "professional";

  const sidebarPrimary =
    tenant?.primary_color?.trim() || "#FF4081";

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 1024;

  /* ================================
     DEFINIÇÃO DOS MENUS
  ===================================*/

  type MenuItem = { to: string; label: string; icon: ReactNode };

  let menu: MenuItem[] = [];

  /* 🌐 MODO GLOBAL — SEM TENANT */
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

  /* 👑 OWNER / MANAGER */
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

  /* 💅 PROFISSIONAIS — SEM DASHBOARD! */
  else {
    menu = [
      { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },
      { to: "/comissoes", label: "Minhas Comissões", icon: <BadgeDollarSign size={20} /> },
      { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
    ];
  }

  /* ================================
     LOGOUT
  ===================================*/
  const handleLogout = async () => {
    await logout();
  };

  /* ================================
     RENDER
  ===================================*/
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
        {/* TOP */}
        <div className={styles.topSection}>
          <span className={styles.logo}>bellas!</span>
          <button className={styles.toggleBtn} onClick={toggleSidebar}>
            ☰
          </button>
        </div>

        {/* MENU */}
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

        {/* FOOTER */}
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
