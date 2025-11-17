import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useAuth } from "../context/AuthProvider";

export function SetupRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { needsSetup, loading } = useUserAndTenant();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (needsSetup && location.pathname !== "/setup") {
      navigate("/setup", { replace: true });
    }
  }, [needsSetup, loading, user, navigate, location.pathname]);

  return <>{children}</>;
}
