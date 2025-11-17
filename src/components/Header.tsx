import { Menu, Sun, Moon, AlertTriangle } from "lucide-react";
import styles from "../css/header.module.css";
import { useUserTenant } from "../context/UserTenantProvider";   // ✔ correto
import { useTheme } from "../hooks/useTheme";
import BrandColorMenu from "./BrandColorMenu";
import { useState, useEffect } from "react";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import "../index.css";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { profile, tenant } = useUserTenant();     // ✔ agora centralizado
  const { theme, toggleTheme } = useTheme();

  const { status } = useEvolutionConnection({
    baseUrl: import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api",
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
    ["DISCONNECTED", "LOGGED_OUT", "ERROR", "UNKNOWN", "IDLE"].includes(status);

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <div className={styles.greeting}>
          {greeting}, {userName}!
        </div>

        {isWhatsDisconnected && (
          <div className={styles.whatsappAlert}>
            <AlertTriangle size={18} className={styles.alertIcon} />
            <span>
              Seu WhatsApp não está conectado. Para utilizar o agendamento com IA,
              conecte o WhatsApp no menu.
            </span>
          </div>
        )}
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconButton} onClick={toggleTheme}>
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <BrandColorMenu />

        {isMobile && (
          <button className={styles.iconButton} onClick={toggleSidebar}>
            <Menu size={20} />
          </button>
        )}

        <div className={styles.separator}></div>

        <div className={styles.userProfile}>
          <img src={avatarUrl} alt={userName} className={styles.avatar} />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
