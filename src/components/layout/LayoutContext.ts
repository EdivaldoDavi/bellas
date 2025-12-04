// src/components/layout/LayoutContext.tsx

import { createContext, useContext } from "react";

export interface LayoutContextType {
  openSidebarAndNavigate: (path: string) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayoutContext(): LayoutContextType {
  const context = useContext(LayoutContext);

  if (!context) {
    // Fallback seguro e silencioso
    return {
      openSidebarAndNavigate: () => {},
      toggleSidebar: () => {},
      closeSidebar: () => {},
    };
  }

  return context;
}
