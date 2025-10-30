// src/components/BrandColorMenu.tsx
import { useState } from "react";
import { Palette } from "lucide-react";
import { useBrandColor } from "../hooks/useBrandColor";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/brandColorMenu.module.css";

const COLORS = [
  { hex: "#ff1493", name: "Rosa" },
  { hex: "#7b61ff", name: "Roxo" },
  { hex: "#3b82f6", name: "Azul" },
  { hex: "#22c55e", name: "Verde" },
  { hex: "#f97316", name: "Laranja" },
  { hex: "#ff0000ff", name: "Preto" },
];

export default function BrandColorMenu() {
  const { tenant } = useUserAndTenant();
  const { brandColor, setBrandColor } = useBrandColor(tenant?.primary_color);
  const [open, setOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    // ✅ Salva localmente
    setBrandColor(color);

    // ✅ Aplica imediatamente como variável global
    document.documentElement.style.setProperty("--color-primary", color);

    // ✅ Fecha o menu
    setOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.iconButton}
        onClick={() => setOpen((prev) => !prev)}
        title="Trocar cor do sistema"
      >
        <Palette size={22} strokeWidth={2.2} />
      </button>

      {open && (
        <div className={styles.dropdown}>
          {COLORS.map((c) => (
            <button
              key={c.hex}
              className={styles.colorOption}
              style={{ backgroundColor: c.hex }}
              onClick={() => handleColorSelect(c.hex)}
              title={c.name}
            >
              {brandColor === c.hex && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
