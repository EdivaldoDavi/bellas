"use client";

import { Menu, Sun, Moon, LogOut } from "lucide-react";
import styles from "../css/header.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useTheme } from "../hooks/useTheme";
import BrandColorMenu from "./BrandColorMenu";
import { useState, useEffect, useRef, useMemo } from "react";
import { logout } from "../lib/supabaseCleint";
import "../index.css";
import { useIsMobile } from "../hooks/useIsMobile";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { profile, loading: profileLoading } = useUserAndTenant();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile(1024);

  const headerElementRef = useRef<HTMLDivElement>(null);

  // Novos estados locais para exibição
  const [displayUserName, setDisplayUserName] = useState("");
  const [displayUserRole, setDisplayUserRole] = useState("");
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState("");

  // Efeito para atualizar os estados locais quando o perfil do contexto muda
  useEffect(() => {
    if (!profileLoading && profile) {
      setDisplayUserName(profile.full_name.split(" ")[0]);
      setDisplayUserRole(profile.role || "");
      setDisplayAvatarUrl(profile.avatar_url || "https://i.pravatar.cc/40");
    } else if (!profileLoading && !profile) {
      // Limpa os estados se o perfil se tornar nulo (ex: logout)
      setDisplayUserName("");
      setDisplayUserRole("");
      setDisplayAvatarUrl("");
    }
  }, [profile, profileLoading]);

  // Calcula a saudação baseada na hora atual (memoizado para eficiência)
  const timeBasedGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []); // Array de dependências vazio: calcula apenas uma vez na montagem

  // Atualiza a variável CSS da altura do header
  useEffect(() => {
    const measureAndSetHeight = () => {
      if (headerElementRef.current) {
        const h = headerElementRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-total-height", `${h}px`);
      }
    };
    measureAndSetHeight();
    const handleResize = () => requestAnimationFrame(measureAndSetHeight);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile, profileLoading]);

  const handleLogout = async () => {
    await logout();
  };

  // Usa os estados locais para a verificação de carregamento
  const isLoadingDisplay = profileLoading || !displayUserName;

  return (
    <header ref={headerElementRef} className={styles.header}>
      {/* BLOCO ESQUERDO */}
      <div className={styles.leftSection}>
        {!isLoadingDisplay ? (
          <div className={styles.greeting}>
            {timeBasedGreeting}, {displayUserName}!
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
          {isLoadingDisplay ? (
            <div className={styles.profileSkeleton}>
              <div className={styles.avatarSkeleton}></div>
              <div className={styles.infoSkeleton}>
                <div className={styles.line1}></div>
                <div className={styles.line2}></div>
              </div>
            </div>
          ) : (
            <>
              <img src={displayAvatarUrl} className={styles.avatar} alt="Avatar do usuário" />
              <div className={styles.userInfo}>
                <div className={styles.userName}>{displayUserName}</div>
                <div className={styles.userRole}>{displayUserRole}</div>
              </div>
            </>
          )}
        </div>

        {/* LOGOUT */}
        {!isLoadingDisplay && (
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
}