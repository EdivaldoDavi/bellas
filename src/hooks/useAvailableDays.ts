import { useEffect, useState } from "react";
import { computeAvailableDaysForMonth } from "../services/availability";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

export function useAvailableDays(
  professionalId: string | undefined,
  serviceDuration: number | undefined,
  viewYear: number,
  viewMonth: number
) {
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<Set<string>>(new Set());

  const { tenant } = useUserAndTenant();
  const tenantId: string = tenant?.id || ""; // << 🔥 SEMPRE STRING

  useEffect(() => {
    if (!professionalId || !serviceDuration || !tenantId) return;

    let cancel = false;

    (async () => {
      setLoading(true);
      setAvailable(new Set()); // limpa estado anterior

      const days = await computeAvailableDaysForMonth({
        tenantId,
        professionalId,
        serviceDuration,
        year: viewYear,
        month: viewMonth,
      });

      if (!cancel) setAvailable(days);
      setLoading(false);
    })();

    return () => { cancel = true; };
  }, [professionalId, serviceDuration, viewYear, viewMonth, tenantId]);

  return { loading, available };
}
