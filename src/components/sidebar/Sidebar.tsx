import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";

import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  Calendar,
  Settings,
  User,
  BadgeDollarSign,
  LogOut,
} from "lucide-react";
import styles from "../../css/Sidebar.module.css";
import { toast } from "react-toastify";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import EmDesenvolvimento from "../EmDesenvolvimento";

type MenuItem = { to: string; label: string; icon: ReactNode };

const THEME_PRIMARY: Record<string, string> = {
  pink: "#FF4081",
  purple: "#9C27B0",
  blue: "#007BFF",
  green: "#2ECC71",
};

export default function Sidebar({
  isOpen,
  toggleSidebar,
  closeSidebar,
}: {
  isOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}) {
  const navigate = useNavigate();
  const { profile, tenant } = useUserAndTenant();

  const role = profile?.role ?? "professional";
  const variant = tenant?.theme_variant ?? "pink";
  const primary = THEME_PRIMARY[variant] ?? THEME_PRIMARY.pink;

let menu: MenuItem[] = role === "superuser"
  ? [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { to: "/saloes", label: "Salões", icon: <Building2 size={20} /> },
      { to: "/assinaturas", label: "Assinaturas", icon: <CreditCard size={20} /> },

      // ✅ WhatsApp para superuser
      { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} /> },

      { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
    ]
  : role === "manager"
  ? [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },
      { to: "/usuarios", label: "Usuários", icon: <EmDesenvolvimento /> }, // { to: "/usuarios", label: "Usuários", icon: // <Users size={20} /> },
      { to: "/config", label: "Configurações", icon: <Settings size={20} /> },

      // ✅ WhatsApp para manager
      { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} /> },

      { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
    ]
  : [
      // ✅ professional → sem WhatsApp
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
      { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },
      { to: "/comissoes", label: "Minhas Comissões", icon: <BadgeDollarSign size={20} /> },
      { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
    ];

  const handleLogout = async () => {
    try {
      localStorage.clear();
      toast.success("Sessão encerrada com sucesso! 👋");
      navigate("/login", { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  };

  const isMobile = window.innerWidth < 1024;

  return (
    <>
      {/* Overlay só no mobile e quando sidebar estiver aberta */}
      {isMobile && isOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      <aside
        className={`${styles.sidebar} ${
          isMobile ? (isOpen ? styles.open : styles.collapsed) : isOpen ? "" : styles.collapsed
        }`}
        style={
          {
            ["--sidebar-primary" as any]: primary,
          } as React.CSSProperties
        }
      >
        <div className={styles.topSection}>
          <span className={styles.logo}>bellas!</span>
          <button
            className={styles.toggleBtn}
            onClick={toggleSidebar}
            aria-label="Abrir/fechar menu"
            type="button"
          >
            ☰
          </button>
        </div>

        <nav className={styles.menu}>
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-label={item.label}
              className={({ isActive }) =>
                `${styles.menuItem} ${isActive ? styles.active : ""}`
              }
              onClick={() => {
                if (isMobile) closeSidebar(); // auto-fecha no mobile
              }}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <button
            className={styles.menuItem}
            data-label="Sair"
            onClick={handleLogout}
            type="button"
          >
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
