// src/hooks/useAvailableDays.ts
import { useEffect, useState } from "react";
import { computeAvailableDaysForMonth } from "../services/availability";

export function useAvailableDays(professionalId: string | undefined, serviceDuration: number | undefined, viewYear: number, viewMonth: number) {
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<Set<string>>(new Set());

  useEffect(() => {
  if (!professionalId || !serviceDuration) return;
  let cancel = false;

  (async () => {
    setLoading(true);
    setAvailable(new Set()); // ✅ limpa o anterior durante carregamento
    const days = await computeAvailableDaysForMonth({
      professionalId,
      serviceDuration,
      year: viewYear,
      month: viewMonth,
    });
    if (!cancel) setAvailable(days);
    setLoading(false);
  })();

  return () => {
    cancel = true;
  };
}, [professionalId, serviceDuration, viewYear, viewMonth]);

  return { loading, available };
}
