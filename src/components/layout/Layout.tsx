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

// Layouts especiais
import SetupLayout from "./SetupLayout";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile(1024);
  const location = useLocation();
  const navigate = useNavigate();

  const { tenant, profile, needsSetup } = useUserAndTenant();

  // Rota e estado do onboarding
  const isSetupRoute = location.pathname.startsWith("/setup");
  const isOnboardingRoute = location.pathname.startsWith("/onboarding");
  const onboardingStep = tenant?.onboarding_step ?? 0;

  /* ======================================================
     1) 🔒 Layout bloqueado para Setup ou Onboarding
  ====================================================== */
  const layoutIsBlocked =
    needsSetup ||
    isSetupRoute ||
    (tenant && onboardingStep < 99) ||
    isOnboardingRoute;

  const toggleSidebar = () => setSidebarOpen((p) => !p);
  const closeSidebar = () => setSidebarOpen(false);

  /* ======================================================
     WhatsApp conexão
  ====================================================== */
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

  useEffect(() => {
    if (layoutIsBlocked) return; // 🔥 Nunca mostrar toast em Setup/Onboarding

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
  }, [
    isWhatsDisconnected,
    instanceId,
    location.pathname,
    profile?.role,
    layoutIsBlocked,
  ]);

  /* ======================================================
     Navegação do Sidebar
  ====================================================== */
  const openSidebarAndNavigate = useCallback(
    (path: string) => {
      setSidebarOpen(true);
      navigate(path);
      if (isMobile) closeSidebar();
    },
    [navigate, isMobile]
  );

  /* ======================================================
     Provider do Layout
  ====================================================== */
  const layoutContextValue = useMemo<LayoutContextType>(() => {
    return {
      openSidebarAndNavigate,
      toggleSidebar,
      closeSidebar,
    };
  }, [openSidebarAndNavigate]);

  /* ======================================================
     🎨 Wrapper classes
  ====================================================== */
  const wrapperClass = `
    ${styles.layoutWrapper}
    ${!isMobile && !sidebarOpen ? styles.isCollapsed : ""}
    ${isMobile && sidebarOpen ? styles.isMobileSidebarOpen : ""}
  `;

  /* ======================================================
     🔥 RENDERIZAÇÃO PRINCIPAL
  ====================================================== */

  // Caso Setup ou Onboarding → usar layout especial bloqueado
  if (layoutIsBlocked) {
    return (
      <LayoutContext.Provider value={layoutContextValue}>
        <SetupLayout>
          <Outlet />
        </SetupLayout>
      </LayoutContext.Provider>
    );
  }

  // Caso normal → layout completo com sidebar e header
  return (
    <LayoutContext.Provider value={layoutContextValue}>
      <div className={wrapperClass}>
        {/* Sidebar */}
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

        {/* Overlay mobile */}
        {isMobile && sidebarOpen && (
          <div className={styles.mobileOverlay} onClick={closeSidebar} />
        )}

        {/* Conteúdo principal */}
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
