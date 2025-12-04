import { createContext, useContext } from "react";

export interface LayoutContextType {
  openSidebarAndNavigate: (path: string) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutContext must be used within a LayoutProvider");
  }
  return context;
}