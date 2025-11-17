import { Menu, Sun, Moon, AlertTriangle } from "lucide-react";
import styles from "../css/header.module.css";

import { useUserTenant } from "../context/UserTenantProvider";  // <-- NOVO PROVIDER
import { useTheme } from "../hooks/useTheme";
import BrandColorMenu from "./BrandColorMenu";
import { useState, useEffect } from "react";

import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import "../index.css";

export default function Header({
  toggleSidebar,
}: {
  toggleSidebar: () => void;
}) {
  /* ============================================================
     🔥 Dados globais via Provider
  ============================================================ */
  const { profile, tenant } = useUserTenant();
  const { theme, toggleTheme } = useTheme();

  /* ============================================================
     📡 Evolução WhatsApp
  ============================================================ */
  const { status } = useEvolutionConnection({
    baseUrl: import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api",
    autostart: false,
    initialInstanceId: tenant?.id || "",
  });

  /* ============================================================
     📱 Mobile detection
  ============================================================ */
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // Saudações dinâmicas
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");

    // Resize listener
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ============================================================
     🧑 Info do usuário
  ============================================================ */
  const userName = profile?.full_name?.split(" ")[0] || "Usuário";
  const userRole = profile?.role || "...";
  const avatarUrl = profile?.avatar_url || "https://i.pravatar.cc/40";

  /* ============================================================
     🔔 Estado do WhatsApp
  ============================================================ */
  const isWhatsDisconnected =
    !status ||
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "ERROR" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  /* ============================================================
     🖥️ RENDER
  ============================================================ */
  return (
    <header className={styles.header}>
      {/* BLOCO ESQUERDO */}
      <div className={styles.leftSection}>
        <div className={styles.greeting}>
          {greeting}, {userName}!
        </div>

        {/* ⚠️ Alerta WhatsApp desconectado */}
        {isWhatsDisconnected && (
          <div className={styles.whatsappAlert}>
            <AlertTriangle size={18} className={styles.alertIcon} />
            <span>
              Seu WhatsApp não está conectado. Para utilizar o agendamento com IA,
              conecte o WhatsApp pelo menu “Integrações”.
            </span>
          </div>
        )}
      </div>

      {/* BLOCO DIREITO */}
      <div className={styles.rightSection}>
        {/* Botão de tema */}
        <button
          className={styles.iconButton}
          onClick={toggleTheme}
          title="Alternar tema"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Menu de cor primária */}
        <BrandColorMenu />

        {/* Menu Mobile */}
        {isMobile && (
          <button
            className={styles.iconButton}
            onClick={toggleSidebar}
            title="Abrir menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className={styles.separator}></div>

        {/* Perfil */}
        <div className={styles.userProfile}>
          <img
            src={avatarUrl}
            alt={`Avatar de ${userName}`}
            className={styles.avatar}
          />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
