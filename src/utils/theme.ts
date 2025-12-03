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
 * Aplica as cores primária e secundária do tenant como variáveis CSS.
 * Não interfere com o tema light/dark, que é gerenciado pelo useTheme.
 */
export function applyTenantTheme(tenant?: Partial<Tenant> | null) {
  const root = document.documentElement;

  const defaultPrimary = "#8343A2"; // Cor primária padrão
  const defaultSecondary = "#e0b6f5"; // Cor secundária padrão

  // Define as cores primária e secundária (e RGB)
  // Se um tenant for fornecido e tiver cores personalizadas, usa-as.
  // Caso contrário, usa as cores padrão.
  const primaryColorToApply = tenant?.primary_color || defaultPrimary;
  const secondaryColorToApply = tenant?.secondary_color || defaultSecondary;

  root.style.setProperty("--color-primary", primaryColorToApply);
  root.style.setProperty("--color-primary-rgb", hexToRgb(primaryColorToApply));
  root.style.setProperty("--color-secondary", secondaryColorToApply);

  // IMPORTANTE: Esta função NÃO deve definir outras variáveis de tema como --bg, --text, etc.
  // Essas variáveis são controladas pelo CSS global (src/index.css) com base no atributo data-theme.
  // Todas as linhas que setavam --bg, --text, --separator, --card-bg, etc. foram removidas daqui.
}