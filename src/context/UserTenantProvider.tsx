// src/context/UserTenantProvider.tsx
import { createContext, useContext, type ReactNode } from "react";
import { useUserAndTenant } from "../hooks/useUserAndTenant"; // <-- seu hook atual

const UserTenantContext = createContext<any>(null);

export function UserTenantProvider({ children }: { children: ReactNode }) {
  const state = useUserAndTenant(); // <-- agora rodando apenas uma vez
  return (
    <UserTenantContext.Provider value={state}>
      {children}
    </UserTenantContext.Provider>
  );
}

export function useUserTenant() {
  const ctx = useContext(UserTenantContext);
  if (!ctx) {
    throw new Error("useUserTenant deve ser usado dentro de <UserTenantProvider>");
  }
  return ctx;
}
