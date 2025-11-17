import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserAndTenant } from "./useUserAndTenant";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { needsSetup, loading } = useUserAndTenant();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // só verifica quando terminar de carregar
    if (loading) return;

    // só redireciona usuários logados
    if (!user) return;

    // usuário logado sem tenant → vai para setup
    if (needsSetup && location.pathname !== "/setup") {
      navigate("/setup", { replace: true });
    }
  }, [needsSetup, user, loading, navigate, location.pathname]);

  return <>{children}</>;
}
