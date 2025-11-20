import { useRef, useState } from "react";
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
   * REFERÊNCIA para medir o header
   * O Header.tsx agora é o responsável por definir --header-total-height.
   * Este ref ainda é útil para o Header.tsx medir sua própria altura.
   */
  const headerRef = useRef<HTMLDivElement | null>(null);

  // Removida a lógica de `whatsappAlertFlag` e o `useEffect` correspondente.
  // O `pageContent` agora depende diretamente de `--header-total-height`
  // que é atualizado pelo componente `Header`.

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