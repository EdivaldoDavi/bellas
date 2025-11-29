import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import Sidebar from "../sidebar/Sidebar";
import Header from "../Header";

import { useIsMobile } from "../../hooks/useIsMobile";
import { useEvolutionConnection } from "../../hooks/useEvolutionConnection";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";

//import WhatsAppDisconnectedToast from "../WhatsAppDisconnectedToast";

import styles from "./Layout.module.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile(1024);
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen((p) => !p);
  const closeSidebar = () => setSidebarOpen(false);

  const { tenant, profile } = useUserAndTenant();

  const instanceId = tenant?.id ?? "";
  const evoBase =
    import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api";

  const { status } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  const isWhatsDisconnected =
    !status ||
    ["DISCONNECTED", "LOGGED_OUT", "ERROR", "UNKNOWN", "IDLE"].includes(status);

  /* =====================================================================
     🔔 LÓGICA DO TOAST – MUITO MAIS LIMPA E SEGURA
  ===================================================================== */
  useEffect(() => {
    let toastId: number | string | null = null;

    // Apenas owner ou manager devem ver o aviso/*
    /*
    const canShow =
      instanceId &&
      isWhatsDisconnected &&
      (profile?.role === "manager" || profile?.role === "owner");
*/
    const dismissedKey = `whatsapp_alert_dismissed_instance_${instanceId}`;
/*
    // Mostrar toast
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
          draggable: false,
          closeOnClick: false,
        }
      );
    }
*/
    // Se reconectar → remover toast e resetar estado
    if (!isWhatsDisconnected && instanceId) {
      toast.dismiss();
      localStorage.removeItem(dismissedKey);
    }

    return () => {
      if (toastId !== null) toast.dismiss(toastId);
    };
  }, [isWhatsDisconnected, instanceId, location.pathname, profile?.role]);

  /* =====================================================================
     📌 CLASSES DE ESTADO DO LAYOUT
  ===================================================================== */
  const rootClass = `
    ${styles.layoutWrapper}
    ${!isMobile && !sidebarOpen ? styles.isCollapsed : ""}
    ${isMobile && sidebarOpen ? styles.isMobileSidebarOpen : ""}
  `;

  /* =====================================================================
     📌 RENDER
  ===================================================================== */
  return (
    <div className={rootClass}>
      {/* SIDEBAR */}
      <aside
        className={`${styles.sidebar} ${
          !isMobile && !sidebarOpen ? styles.collapsed : ""
        }`}
      >
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          closeSidebar={closeSidebar}
        />
      </aside>

      {/* BACKDROP EM MOBILE */}
      {isMobile && sidebarOpen && (
        <div className={styles.mobileOverlay} onClick={closeSidebar} />
      )}

      {/* ÁREA PRINCIPAL */}
      <main className={styles.contentWrapper}>
        <header className={styles.headerWrapper}>
          <Header toggleSidebar={toggleSidebar} />
        </header>

        <section className={styles.pageContent}>
          <Outlet />
        </section>
      </main>
    </div>
  );
}
