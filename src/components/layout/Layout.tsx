// src/components/layout/Layout.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Sidebar from "../sidebar/Sidebar";
import Header from "../Header";

import { useIsMobile } from "../../hooks/useIsMobile";
import { useEvolutionConnection } from "../../hooks/useEvolutionConnection";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";

import WhatsAppDisconnectedToast from "../WhatsAppDisconnectedToast";

import styles from "./Layout.module.css";
import { LayoutContext, type LayoutContextType } from "./LayoutContext";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile(1024);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarOpen(p => !p);
  const closeSidebar = () => setSidebarOpen(false);

  const { tenant, profile } = useUserAndTenant();
  const instanceId = tenant?.id ?? "";

  const evoBase = import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api";

  const { status } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  const isWhatsDisconnected =
    !status ||
    ["DISCONNECTED", "LOGGED_OUT", "ERROR", "UNKNOWN", "IDLE"].includes(status);

  /* ===========================
     🔔 Toast de desconexão WhatsApp
  ============================ */
  useEffect(() => {
    let toastId: number | string | null = null;
    const canShow =
      instanceId &&
      isWhatsDisconnected &&
      (profile?.role === "manager" || profile?.role === "owner");

    const dismissedKey = `whatsapp_alert_${instanceId}`;

    if (canShow && !localStorage.getItem(dismissedKey)) {
      toastId = toast(
        () => (
          <WhatsAppDisconnectedToast
            instanceId={instanceId}
            closeToast={() => {
              if (toastId !== null) toast.dismiss(toastId);
              localStorage.setItem(dismissedKey, "true");
            }}
          />
        ),
        {
          position: "bottom-center",
          autoClose: false,
          closeButton: false,
          hideProgressBar: true,
        }
      );
    }

    if (!isWhatsDisconnected && instanceId) {
      toast.dismiss();
      localStorage.removeItem(dismissedKey);
    }

    return () => {
      if (toastId !== null) toast.dismiss(toastId);
    };
  }, [isWhatsDisconnected, instanceId, location.pathname, profile?.role]);

  /* ===========================
     📌 Função universal de navegação
  ============================ */
  const openSidebarAndNavigate = useCallback(
    (path: string) => {
      setSidebarOpen(true);
      navigate(path);
      if (isMobile) closeSidebar();
    },
    [navigate, isMobile]
  );

  /* ===========================
     📌 Value do Provider
  ============================ */
  const layoutContextValue = useMemo<LayoutContextType>(() => {
    return {
      openSidebarAndNavigate,
      toggleSidebar,
      closeSidebar,
    };
  }, [openSidebarAndNavigate]);

  const wrapperClass = `
    ${styles.layoutWrapper}
    ${!isMobile && !sidebarOpen ? styles.isCollapsed : ""}
    ${isMobile && sidebarOpen ? styles.isMobileSidebarOpen : ""}
  `;

  return (
    <LayoutContext.Provider value={layoutContextValue}>
      <div className={wrapperClass}>
        <aside className={`${styles.sidebar} ${!isMobile && !sidebarOpen ? styles.collapsed : ""}`}>
          <Sidebar
            isOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            closeSidebar={closeSidebar}
          />
        </aside>

        {isMobile && sidebarOpen && (
          <div className={styles.mobileOverlay} onClick={closeSidebar} />
        )}

        <main className={styles.contentWrapper}>
          <header className={styles.headerWrapper}>
            <Header toggleSidebar={toggleSidebar} />
          </header>

          <section className={styles.pageContent}>
            <Outlet />
          </section>
        </main>
      </div>
    </LayoutContext.Provider>
  );
}
