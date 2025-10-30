import Sidebar from "../sidebar/Sidebar";
import { Outlet } from "react-router-dom";
import styles from "./Layout.module.css";
import { useState } from "react";
import Header from "../Header";
import { useIsMobile } from "../../hooks/useIsMobile";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);
  const isMobile = useIsMobile(1024);

  const rootClass = `
    ${styles.layoutWrapper}
    ${!isMobile && !sidebarOpen ? styles.isCollapsed : ""}
    ${isMobile && sidebarOpen ? styles.isMobileSidebarOpen : ""}
  `;

  return (
    <div className={rootClass}>
  <div className={`${styles.sidebar} ${!isMobile && !sidebarOpen ? styles.collapsed : ""}`}>
    <Sidebar
      isOpen={sidebarOpen}
      toggleSidebar={toggleSidebar}
      closeSidebar={closeSidebar}
    />
  </div>

  {/* Overlay que fecha a sidebar no mobile */}
  {isMobile && sidebarOpen && (
    <div
      className={styles.mobileOverlay}
      onClick={closeSidebar}
    />
  )}

  <div className={styles.contentWrapper}>
    <div className={styles.headerWrapper}>
      <Header toggleSidebar={toggleSidebar} />
    </div>

    <div className={styles.pageContent}>
      <Outlet />
    </div>
  </div>
</div>

  );
}
