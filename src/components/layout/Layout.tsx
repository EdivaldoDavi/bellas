import {  useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import Sidebar from "../sidebar/Sidebar";
import Header from "../Header";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useEvolutionConnection } from "../../hooks/useEvolutionConnection";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import WhatsAppDisconnectedToast from "../WhatsAppDisconnectedToast"; // Importar o novo componente de toast

import styles from "./Layout.module.css";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile(1024);
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen((p) => !p);
  const closeSidebar = () => setSidebarOpen(false);

  // const headerRef = useRef<HTMLDivElement | null>(null); // REMOVIDO: Este ref não é usado para cálculo de altura

  const { tenant } = useUserAndTenant();
  const instanceId = tenant?.id || "";
  const evoBase = import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api";

  const { status } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  const isWhatsDisconnected =
    !status ||
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "ERROR" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  // ============================================================
  // Lógica para exibir/ocultar o toast de WhatsApp desconectado
  // ============================================================
useEffect(() => {
  let toastId: string | number | null = null;
  const dismissedKey = `whatsapp_alert_dismissed_instance_${instanceId}`;

  if (isWhatsDisconnected && instanceId && !localStorage.getItem(dismissedKey)) {
    toastId = toast((t) => (
      <WhatsAppDisconnectedToast
        instanceId={instanceId}
        closeToast={() => {
          // Usa a função própria do react-toastify
          t.closeToast();
          localStorage.setItem(dismissedKey, "true"); // Marca como descartado
        }}
      />
    ), {
      position: "bottom-center",
      autoClose: false,
      closeButton: false,
      hideProgressBar: true,
      draggable: false,
      closeOnClick: false,
    });
  } else if (!isWhatsDisconnected && instanceId) {
    // Conectou: fecha qualquer toast e limpa flag
    toast.dismiss();
    localStorage.removeItem(dismissedKey);
  }

  // Cleanup ao desmontar ou mudar dependências
  return () => {
    if (toastId !== null) {
      toast.dismiss(toastId);
    }
  };
}, [isWhatsDisconnected, instanceId, location.pathname]);

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
        <div className={styles.headerWrapper}> {/* Removido ref={headerRef} */}
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
