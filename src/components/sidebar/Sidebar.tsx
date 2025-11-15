import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "../../lib/supabaseCleint";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
 
  Calendar,
  Settings,
  User,
  BadgeDollarSign,
  LogOut,
  PlusCircle,
} from "lucide-react";

import styles from "../../css/Sidebar.module.css";

import { useUserAndTenant } from "../../hooks/useUserAndTenant";

// 🔥 Modais reutilizáveis
import ModalNewCustomer from "../../components/ModalNewCustomer";
import ModalNewProfessional from "../../components/ModalNewProfessional";
import ModalNewService from "../../components/ModalNewService";
import ModalNewUser from "../../components/ModalNewUser";

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

  // 🔥 controla o submenu Cadastros
  const [showCadastroMenu, setShowCadastroMenu] = useState(false);

  // 🔥 controla cada modal individualmente
  const [openCustomerModal, setOpenCustomerModal] = useState(false);
  const [openServiceModal, setOpenServiceModal] = useState(false);
  const [openProfessionalModal, setOpenProfessionalModal] = useState(false);
  const [openUserModal, setOpenUserModal] = useState(false);

  // 🔥 MENU CONFIG
  let menu: MenuItem[] =
    role === "superuser"
      ? [
          { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
          { to: "/saloes", label: "Salões", icon: <Building2 size={20} /> },
          { to: "/assinaturas", label: "Assinaturas", icon: <CreditCard size={20} /> },
          { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} /> },
          { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
        ]
      : role === "manager"
      ? [
          { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
          { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },

          // 🔥 botão Cadastros
          { to: "#cadastros", label: "Cadastros", icon: <PlusCircle size={20} /> },

         
          { to: "/config", label: "Configurações", icon: <Settings size={20} /> },
          { to: "/integracoes/whatsapp", label: "WhatsApp", icon: <MessageCircle size={20} /> },
          { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
        ]
      : [
          { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
          { to: "/agenda", label: "Agenda", icon: <Calendar size={20} /> },
          { to: "/comissoes", label: "Minhas Comissões", icon: <BadgeDollarSign size={20} /> },
          { to: "/perfil", label: "Meu Perfil", icon: <User size={20} /> },
        ];

const handleLogout = async () => {
  try {
    await supabase.auth.signOut(); // 🔥 desloga de verdade
  } catch (e) {
    console.warn("Erro ao deslogar:", e);
  }

  // Redireciona imediatamente
  navigate("/login?logged_out=1", { replace: true });
};

  const isMobile = window.innerWidth < 1024;

  return (
    <>
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

          <button className={styles.toggleBtn} onClick={toggleSidebar}>
            ☰
          </button>
        </div>

        <nav className={styles.menu}>
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to === "#cadastros" ? "#" : item.to}
              className={({ isActive }) =>
                `${styles.menuItem} ${isActive && item.to !== "#cadastros" ? styles.active : ""}`
              }
              onClick={(e) => {
                if (isMobile) closeSidebar();

                if (item.to === "#cadastros") {
                  e.preventDefault();
                  setShowCadastroMenu(true);
                  return;
                }
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

      {/* SUBMENU CADASTROS */}
      {showCadastroMenu && (
        <div className={styles.submenuOverlay} onClick={() => setShowCadastroMenu(false)}>
          <div className={styles.submenuBox} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.subBtn}
              onClick={() => {
                setOpenCustomerModal(true);
                setShowCadastroMenu(false);
              }}
            >
              Novo Cliente
            </button>

            <button
              className={styles.subBtn}
              onClick={() => {
                setOpenServiceModal(true);
                setShowCadastroMenu(false);
              }}
            >
              Novo Serviço
            </button>

            <button
              className={styles.subBtn}
              onClick={() => {
                setOpenProfessionalModal(true);
                setShowCadastroMenu(false);
              }}
            >
              Novo Profissional
            </button>

            <button
              className={styles.subBtn}
              onClick={() => {
                setOpenUserModal(true);
                setShowCadastroMenu(false);
              }}
            >
              Novo Usuário
            </button>
          </div>
        </div>
      )}

      {/* MODAIS */}
      <ModalNewCustomer
        tenantId={tenant?.id}
        mode="cadastro"
        show={openCustomerModal}
        onClose={() => setOpenCustomerModal(false)}
      />

      <ModalNewService
        tenantId={tenant?.id}
        mode="cadastro"
        show={openServiceModal}
        onClose={() => setOpenServiceModal(false)}
      />

      <ModalNewProfessional
        tenantId={tenant?.id}
        mode="cadastro"
        show={openProfessionalModal}
        onClose={() => setOpenProfessionalModal(false)}
      />

      <ModalNewUser
        tenantId={tenant?.id}
      
        show={openUserModal}
        onClose={() => setOpenUserModal(false)}
      />
    </>
  );
}
