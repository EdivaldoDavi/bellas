import { useEffect, useState } from "react";
import { getCurrentProfile } from "../../lib/supabaseCleint";

export function useUserRole() {
  const [role, setRole] = useState<"superuser" | "manager" | "professional">("professional");

  useEffect(() => {
    (async () => {
      try {
        const profile = await getCurrentProfile();
        if (profile?.role) {
          setRole(profile.role as "superuser" | "manager" | "professional");
        }
      } catch (err) {
        console.error("Erro ao buscar role:", err);
      }
    })();
  }, []);

  return { role };
}
