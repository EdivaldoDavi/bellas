import { useEffect, useState } from "react";

export function useBrandColor(initialColor?: string) {
  const [brandColor, setBrandColor] = useState(
    localStorage.getItem("brand_color") || initialColor || "#ff1493"
  );

  useEffect(() => {
    if (!brandColor) return;

    // salva no localStorage
    localStorage.setItem("brand_color", brandColor);

    // aplica em todas as variáveis
    const root = document.documentElement;
    root.style.setProperty("--color-primary", brandColor);
    root.style.setProperty("--sidebar-primary", brandColor);

    // Se quiser deixar o hover coerente
    root.style.setProperty("--color-primary-hover", brandColor + "cc");
  }, [brandColor]);

  return { brandColor, setBrandColor };
}
