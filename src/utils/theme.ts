// src/utils/theme.ts
import type { Tenant } from "../hooks/useUserAndTenant";

// Helper
function hexToRgb(hex: string): string {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

/**
 * Aplica o tema do tenant ou o tema padrão (light) se nenhum tenant for fornecido.
 * As cores primária e secundária do tenant sobrescrevem as cores padrão.
 */
export function applyTenantTheme(tenant?: Partial<Tenant> | null) {
  const root = document.documentElement;

  // Sempre define as variáveis CSS para o tema light padrão
  // O atributo data-theme é gerenciado pelo useTheme, não por esta função.
  const defaultPrimary = "#8343A2"; // Cor primária padrão
  const defaultSecondary = "#e0b6f5"; // Cor secundária padrão

  root.style.setProperty("--bg", "#ffffff");
  root.style.setProperty("--text", "#111111");
  root.style.setProperty("--text-muted", "#666666");
  root.style.setProperty("--separator", "#e5e5e5");
  root.style.setProperty("--card-bg", "#ffffff");
  root.style.setProperty("--card-alt-bg", "#f9f9fa");
  root.style.setProperty("--sidebar-bg", "#ffffff");
  root.style.setProperty("--header-bg", "#ffffff");

  root.style.setProperty("--color-success", "#2ecc71");
  root.style.setProperty("--color-warning", "#ffb300");
  root.style.setProperty("--color-danger", "#ff5a5f");
  root.style.setProperty("--theme-invert", "0"); // Sempre 0 para tema light

  root.style.setProperty("--modal-bg", "#ffffff");
  root.style.setProperty("--input-bg", "#f5f5f7");
  root.style.setProperty("--input-border", "#e5e5e5");
  root.style.setProperty("--border", "#e5e5e5");

  // Agora, se um tenant for fornecido E tiver cores personalizadas, sobrescreve as variáveis
  if (tenant && tenant.primary_color && tenant.secondary_color) {
    const primary = tenant.primary_color;
    const secondary = tenant.secondary_color;

    root.style.setProperty("--color-primary", primary);
    root.style.setProperty("--color-primary-rgb", hexToRgb(primary));
    root.style.setProperty("--color-secondary", secondary);
  } else {
    // Se não houver tenant ou cores personalizadas, garante que as cores primária/secundária
    // também usem os valores padrão definidos acima.
    root.style.setProperty("--color-primary", defaultPrimary);
    root.style.setProperty("--color-primary-rgb", hexToRgb(defaultPrimary));
    root.style.setProperty("--color-secondary", defaultSecondary);
  }
}