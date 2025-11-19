import { Menu, Sun, Moon, AlertTriangle, LogOut } from "lucide-react";
import styles from "../css/header.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useTheme } from "../hooks/useTheme";
import BrandColorMenu from "./BrandColorMenu";
import { useState, useEffect, useRef } from "react";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import { supabase } from "../lib/supabaseCleint";
import {  useNavigate } from "react-router-dom";
import "../index.css";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { profile, tenant } = useUserAndTenant();
  const { theme, toggleTheme } = useTheme();

  const ref = useRef<HTMLDivElement>(null);
 const navigate = useNavigate();
  /** Atualizar var do CSS para altura total do header */
  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const h = ref.current.offsetHeight;
      document.documentElement.style.setProperty("--header-total-height", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { status } = useEvolutionConnection({
    baseUrl: import.meta.env.VITE_EVO_PROXY_URL ?? "https://bellas-agenda-evo-proxy.hu6h7e.easypanel.host/api",
    autostart: false,
    initialInstanceId: tenant?.id || "",
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");

    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const userName = profile?.full_name?.split(" ")[0] || "Usuário";
  const userRole = profile?.role || "...";
  const avatarUrl = profile?.avatar_url || "https://i.pravatar.cc/40";

  const isWhatsDisconnected =
    !status ||
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "ERROR" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  /** --- LOGOUT --- */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Erro ao deslogar:", e);
    }
    navigate("/login?logged_out=1", { replace: true });
  };


  return (
    <header ref={ref} className={styles.header}>
      {/* BLOCO ESQUERDO: saudação + alerta */}
      <div className={styles.leftSection}>
        <div className={styles.greeting}>
          {greeting}, {userName}!
        </div>

        {isWhatsDisconnected && (
          <div className={styles.whatsappAlert}>
            <AlertTriangle size={18} className={styles.alertIcon} />
            <span>
              Seu WhatsApp não está conectado. Para utilizar o agendamento com IA,
              é necessário conectar o WhatsApp na opção Whatsapp do menu.
            </span>
          </div>
        )}
      </div>

      {/* BLOCO DIREITO */}
      <div className={styles.rightSection}>

        {/* Tema dark/light */}
        <button className={styles.iconButton} onClick={toggleTheme} title="Alternar tema">
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

        {/* PERFIL */}
        <div className={styles.userProfile}>
          <img src={avatarUrl} alt={`Avatar de ${userName}`} className={styles.avatar} />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>{userRole}</div>
          </div>
        </div>

        {/* 🔥 BOTÃO DE SAIR */}
        <button className={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={20} />
        </button>

      </div>
    </header>
  );
}
