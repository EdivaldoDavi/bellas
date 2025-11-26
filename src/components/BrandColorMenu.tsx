import { useState } from "react";
import { Palette } from "lucide-react";
import { useUserTenant } from "../context/UserTenantProvider";
import { supabase } from "../lib/supabaseCleint";
import styles from "../css/brandColorMenu.module.css";
// No need to import applyTenantTheme here, useApplyTenantTheme hook handles it

const COLORS = [
  { hex: "#ff1493", name: "Rosa" },
  { hex: "#7b61ff", name: "Roxo" },
  { hex: "#3b82f6", name: "Azul" },
  { hex: "#22c55e", name: "Verde" },
  { hex: "#f97316", name: "Laranja" },
  { hex: "#ff0000", name: "Preto" },
];

export default function BrandColorMenu() {
  const { tenant, refreshTenant } = useUserTenant();
  const [open, setOpen] = useState(false);

  // Use tenant.primary_color directly for display and comparison
  const currentBrandColor = tenant?.primary_color ?? "#ff1493";

  const handleColorSelect = async (color: string) => {
    if (!tenant?.id) return;

    // 1️⃣ Salva no Supabase
    const { error } = await supabase
      .from("tenants")
      .update({ primary_color: color })
      .eq("id", tenant.id);

    if (error) {
      console.error(error);
      return;
    }

    // 2️⃣ Atualiza contexto global, que por sua vez acionará useApplyTenantTheme
    await refreshTenant();

    // 3️⃣ Fecha o menu
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
              {currentBrandColor === c.hex && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}