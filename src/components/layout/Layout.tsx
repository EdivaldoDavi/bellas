import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../sidebar/Sidebar"; 
import Header from "../Header";
import { useIsMobile } from "../../hooks/useIsMobile";

import styles from "./Layout.module.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile(1024);

  const toggleSidebar = () => setSidebarOpen((p) => !p);
  const closeSidebar = () => setSidebarOpen(false);

  /** 
   * REFERÊNCIA para medir o header ✔ 
   */
  const headerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Pegamos do localStorage a flag que o Header atualiza
   * sempre que o alerta do WhatsApp é mostrado ou escondido.
   */
  const whatsappAlertFlag =
    typeof window !== "undefined"
      ? localStorage.getItem("whatsapp-alert-visible") === "1"
      : false;

  useEffect(() => {
    function updateHeaderHeight() {
      if (!headerRef.current) return;

      const height = headerRef.current.offsetHeight;

      // Define a variável CSS usada no Layout.module.css
      document.documentElement.style.setProperty(
        "--safe-top",
        `${height}px`
      );
    }

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [whatsappAlertFlag]); // ⭐ Recalcula quando o alerta aparece ou some

  /** classes raiz */
  const rootClass = `
    ${styles.layoutWrapper}
    ${!isMobile && !sidebarOpen ? styles.isCollapsed : ""}
    ${isMobile && sidebarOpen ? styles.isMobileSidebarOpen : ""}
  `;

  return (
    <div className={rootClass}>
      {/* SIDEBAR */}
      <div
        className={`${styles.sidebar} ${
          !isMobile && !sidebarOpen ? styles.collapsed : ""
        }`}
      >
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          closeSidebar={closeSidebar}
        />
      </div>

      {/* OVERLAY MOBILE */}
      {isMobile && sidebarOpen && (
        <div className={styles.mobileOverlay} onClick={closeSidebar} />
      )}

      {/* ÁREA DE CONTEÚDO */}
      <div className={styles.contentWrapper}>
        {/* HEADER FIXO MEDIDO PELO REF */}
        <div ref={headerRef} className={styles.headerWrapper}>
          <Header toggleSidebar={toggleSidebar} />
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
