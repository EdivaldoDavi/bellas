"use client";

import { Menu, Sun, Moon, LogOut } from "lucide-react";
import styles from "../css/header.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useTheme } from "../hooks/useTheme";
import BrandColorMenu from "./BrandColorMenu";
import { useState, useEffect, useRef } from "react";
import { logout } from "../lib/supabaseCleint";
import "../index.css";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { profile,  loading: profileLoading } = useUserAndTenant();
  const { theme, toggleTheme } = useTheme();

  const headerElementRef = useRef<HTMLDivElement>(null); // Renomeado para clareza

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [greeting, setGreeting] = useState("");

  // Debug log para verificar o perfil recebido
  console.log("Header.tsx: Profile received from useUserAndTenant", profile);

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

  // Atualiza var CSS da altura do header
  useEffect(() => {
    const measureAndSetHeight = () => {
      if (headerElementRef.current) {
        const h = headerElementRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-total-height", `${h}px`);
      }
    };

    // Mede inicialmente e em cada render relevante
    measureAndSetHeight();

    // Também mede ao redimensionar a janela
    const handleResize = () => requestAnimationFrame(measureAndSetHeight);
    window.addEventListener("resize", handleResize);

    // Limpa o listener ao desmontar
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile, profileLoading, profile?.full_name]); // Dependências adicionadas: re-medir se o estado mobile ou dados do perfil mudarem

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
    <header ref={headerElementRef} className={styles.header}> {/* Usar o ref renomeado */}

      {/* BLOCO ESQUERDO */}
      <div className={styles.leftSection}>
        {!isLoadingProfile ? (
          <div className={styles.greeting}>
            {greeting}, {userName}!
          </div>
        ) : (
          <div className={styles.greetingSkeleton}></div>
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