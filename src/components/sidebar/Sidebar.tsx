"use client";

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { type ReactNode, type CSSProperties, useMemo } from "react";

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
  Percent,
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
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  const { profile, tenant, loading } = useUserAndTenant(); // Hook 1
  const location = useLocation(); // Hook 2
  const navigate = useNavigate(); // Hook 3

  console.log("Sidebar current path:", location.pathname);

  // Define role and other variables with defaults or conditional access
  // These variables are derived from profile/tenant, but their definition is unconditional.
  const role = profile?.role ?? "professional";
  const sidebarPrimary = tenant?.primary_color?.trim() || "#FF4081";
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  type MenuItem = { to: string; label: string; icon: ReactNode; isModal?: boolean };

  const menu = useMemo(() => {
    // If profile or tenant are not yet loaded, return an empty or minimal menu
    if (loading || !profile) {
      return []; // Return an empty menu during loading
    }

    let currentMenu: MenuItem[] = [];

    if (!tenant) {
      currentMenu = [
        { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { to: "/saloes", label: "Salões", icon: <Building2 size={20} />, isModal: true },
        { to: "/assinaturas", label: "Assinaturas", icon: <CreditCard size={20} />, isModal: true },
        { to: "/gerenciar-acessos", label: "Gerenciar Acessos", icon: <ShieldCheck size={20} />, isModal: true },
        { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} />, isModal: true },
        { to: "/perfil", label: "Meu Perfil", icon: <User size={20} />, isModal: true },
      ];
    }
    else if (role === "owner" || role === "manager") {
      currentMenu = [
        { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },
        { to: "/clientes", label: "Clientes", icon: <Users size={20} />, isModal: true },
        { to: "/servicos", label: "Serviços", icon: <Scissors size={20} />, isModal: true },
        { to: "/profissionais", label: "Profissionais", icon: <UserCog size={20} />, isModal: true },
        { to: "/usuarios", label: "Usuários", icon: <UserPlus size={20} />, isModal: true },
        { to: "/gerenciar-acessos", label: "Gerenciar Acessos", icon: <ShieldCheck size={20} />, isModal: true },
        { to: "/config", label: "Configurações", icon: <Settings size={20} />, isModal: true },
        { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} />, isModal: true },
        { to: "/perfil", label: "Meu Perfil", icon: <User size={20} />, isModal: true },
      ];
    }
    else { // Professional role
      currentMenu = [
        { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
        { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },
        { to: "/commissions", label: "Minhas Comissões", icon: <Percent size={20} />, isModal: true },
        { to: "/perfil", label: "Meu Perfil", icon: <User size={20} />, isModal: true },
      ];
    }
    return currentMenu;
  }, [loading, profile, role, tenant]); // Dependencies for memoization

  const handleLogout = async () => {
    await logout();
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (isMobile) closeSidebar();

    if (item.isModal) {
      navigate(item.to, { state: { from: location.pathname } });
    } else {
      navigate(item.to);
    }
  };

  // The component always renders the <aside> element.
  // Its content is conditionally rendered based on the 'loading' state.
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
          <span className={styles.logo}>
            <img src="/image/bellaslogo.png" alt="Bellas!" className={styles.logoImg} />
          </span>

          <button className={styles.toggleBtn} onClick={toggleSidebar}>
            ☰
          </button>
        </div>

        <nav className={styles.menu}>
          {loading || !profile ? (
            // Render skeleton or minimal menu during loading
            <div className={styles.menuItem}>
              <span className={styles.icon}><LayoutDashboard size={20} /></span>
              <span className={styles.label}>Carregando...</span>
            </div>
          ) : (
            // Render full menu once data is loaded
            menu.map((item) => {
              if (item.isModal) {
                const isActive = location.pathname === item.to;
                return (
                  <div
                    key={item.label}
                    className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.label}>{item.label}</span>
                  </div>
                );
              } else {
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `${styles.menuItem} ${isActive ? styles.active : ""}`
                    }
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.label}>{item.label}</span>
                  </NavLink>
                );
              }
            })
          )}
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