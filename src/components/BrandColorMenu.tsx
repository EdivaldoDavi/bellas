// src/components/BrandColorMenu.tsx
import { useState } from "react";
import { Palette } from "lucide-react";
import { useBrandColor } from "../hooks/useBrandColor";
import { useUserTenant } from "../context/UserTenantProvider";  // <-- CORRETO
import { supabase } from "../lib/supabaseCleint";
import styles from "../css/brandColorMenu.module.css";

const COLORS = [
  { hex: "#ff1493", name: "Rosa" },
  { hex: "#7b61ff", name: "Roxo" },
  { hex: "#3b82f6", name: "Azul" },
  { hex: "#22c55e", name: "Verde" },
  { hex: "#f97316", name: "Laranja" },
  { hex: "#ff0000", name: "Preto" },
];

export default function BrandColorMenu() {
  const { tenant, refreshTenant } = useUserTenant(); // <-- Agora podemos forçar reload global
  const { brandColor, setBrandColor } = useBrandColor(tenant?.primary_color);
  const [open, setOpen] = useState(false);

  const handleColorSelect = async (color: string) => {
    if (!tenant?.id) return;

    // 1️⃣ Atualiza localmente
    setBrandColor(color);
    document.documentElement.style.setProperty("--color-primary", color);

    // 2️⃣ Salva no Supabase
    const { error } = await supabase
      .from("tenants")
      .update({ primary_color: color })
      .eq("id", tenant.id);

    if (error) {
      console.error(error);
      return;
    }

    // 3️⃣ Atualiza contexto global (para não resetar ao navegar)
    await refreshTenant();

    // 4️⃣ Fecha o menu
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
