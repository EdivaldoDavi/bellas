
import { Menu, Sun, Moon, AlertTriangle, LogOut } from "lucide-react";
import styles from "../css/header.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useTheme } from "../hooks/useTheme";
import BrandColorMenu from "./BrandColorMenu";
import { useState, useEffect, useRef } from "react";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import { logout } from "../lib/supabaseCleint";
import "../index.css";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { profile, tenant, loading: profileLoading } = useUserAndTenant();
  const { theme, toggleTheme } = useTheme();

  const ref = useRef<HTMLDivElement>(null);

  const { status } = useEvolutionConnection({
    baseUrl: import.meta.env.VITE_EVO_PROXY_URL ?? "https://bellas-agenda-evo-proxy.hu6h7e.easypanel.host/api",
    autostart: false,
    initialInstanceId: tenant?.id || "",
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [greeting, setGreeting] = useState("");

  // ============================================
  // ⚠ EVITA LOOP → Skeleton até profile carregar
  // ============================================
  const isLoadingProfile = profileLoading || !profile?.full_name;

  const userName = !isLoadingProfile
    ? profile.full_name.split(" ")[0]
    : "";

  const userRole = !isLoadingProfile ? profile.role : "";

  const avatarUrl = !isLoadingProfile
    ? profile.avatar_url || "https://i.pravatar.cc/40"
    : "";

  const isWhatsDisconnected =
    !status ||
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "ERROR" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  // Atualiza var CSS da altura do header
  useEffect(() => {
    const measureAndSetHeight = () => {
      if (ref.current) {
        const h = ref.current.offsetHeight;
        document.documentElement.style.setProperty("--header-total-height", `${h}px`);
      }
    };

    // Mede inicialmente e sempre que isWhatsDisconnected muda
    requestAnimationFrame(measureAndSetHeight);

    // Também mede ao redimensionar a janela
    const handleResize = () => requestAnimationFrame(measureAndSetHeight);
    window.addEventListener("resize", handleResize);

    // Limpa o listener ao desmontar
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isWhatsDisconnected]); // Dependência crucial para reagir ao alerta

  // Flag no localStorage para o layout
  useEffect(() => {
    if (isWhatsDisconnected) {
      localStorage.setItem("whatsapp-alert-visible", "1");
    } else {
      localStorage.removeItem("whatsapp-alert-visible");
    }
  }, [isWhatsDisconnected]);

  // Saudação + mobile resize
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");

    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header ref={ref} className={styles.header}>

      {/* BLOCO ESQUERDO */}
      <div className={styles.leftSection}>
        {!isLoadingProfile ? (
          <div className={styles.greeting}>
            {greeting}, {userName}!
          </div>
        ) : (
          <div className={styles.greetingSkeleton}></div>
        )}

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

      {/* BLOCO DIREITO */}
      <div className={styles.rightSection}>

        {/* Tema */}
        <button className={styles.iconButton} onClick={toggleTheme} title="Alternar tema">
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <BrandColorMenu />

        {/* Menu Mobile */}
        {isMobile && (
          <button className={styles.iconButton} onClick={toggleSidebar} title="Abrir menu">
            <Menu size={20} />
          </button>
        )}

        <div className={styles.separator}></div>

        {/* PERFIL */}
        <div className={styles.userProfile}>
          {isLoadingProfile ? (
            <div className={styles.profileSkeleton}>
              <div className={styles.avatarSkeleton}></div>
              <div className={styles.infoSkeleton}>
                <div className={styles.line1}></div>
                <div className={styles.line2}></div>
              </div>
            </div>
          ) : (
            <>
              <img src={avatarUrl} className={styles.avatar} />
              <div className={styles.userInfo}>
                <div className={styles.userName}>{userName}</div>
                <div className={styles.userRole}>{userRole}</div>
              </div>
            </>
          )}
        </div>

        {/* LOGOUT */}
        {!isLoadingProfile && (
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
