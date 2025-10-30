import { Menu, Sun, Moon } from "lucide-react";
import styles from "../css/header.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useTheme } from "../hooks/useTheme";
import BrandColorMenu from "./BrandColorMenu";
import { useState, useEffect } from "react";
import "../index.css";  // <-- precisa estar aqu
export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { profile } = useUserAndTenant();
  const { theme, toggleTheme } = useTheme();
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

  return (
    <header className={styles.header}>
      <div className={styles.greeting}>{greeting}, {userName}!</div>
      <div className={styles.rightSection}>
        {/* Tema dark/light */}
        <button className={styles.iconButton} onClick={toggleTheme} title="Alternar tema">
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Menu de cor primária */}
        <BrandColorMenu />

        {/* Menu Mobile */}
        {isMobile && (
          <button className={styles.iconButton} onClick={toggleSidebar} title="Abrir menu">
            <Menu size={20} />
          </button>
        )}

        <div className={styles.separator}></div>

        {/* Perfil */}
        <div className={styles.userProfile}>
          <img src={avatarUrl} alt={`Avatar de ${userName}`} className={styles.avatar} />
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
