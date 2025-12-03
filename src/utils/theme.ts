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
 * Agora aceita Tenant PARCIAL:
 * — primary_color?
 * — secondary_color?
 * — theme_variant?
 */
export function applyTenantTheme(tenant?: Partial<Tenant> | null) {
  if (!tenant) return;

  const root = document.documentElement;

  const primary = tenant.primary_color ?? "#8343A2"; // Default if not provided
  const secondary = tenant.secondary_color ?? "#e0b6f5"; // Default if not provided
  const variant = (tenant.theme_variant as "light" | "dark") ?? "light"; // Always 'light' now

  // Set the data-theme attribute
  root.dataset.theme = variant; // This will be 'light'

  // Apply base light theme variables (matching index.css and other modules)
  root.style.setProperty("--bg", "#ffffff");
  root.style.setProperty("--text", "#111111");
  root.style.setProperty("--text-muted", "#666666");
  root.style.setProperty("--separator", "#e5e5e5");
  root.style.setProperty("--card-bg", "#ffffff");
  root.style.setProperty("--card-alt-bg", "#f9f9fa");
  root.style.setProperty("--sidebar-bg", "#ffffff");
  root.style.setProperty("--header-bg", "#ffffff");

  // Override with user-chosen primary and secondary colors
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-primary-rgb", hexToRgb(primary));
  root.style.setProperty("--color-secondary", secondary);

  // Other specific variables that might be used
  root.style.setProperty("--color-success", "#2ecc71");
  root.style.setProperty("--color-warning", "#ffb300");
  root.style.setProperty("--color-danger", "#ff5a5f");
  root.style.setProperty("--theme-invert", "0"); // Always 0 for light theme

  // Ensure modal/input specific variables are also set for light theme
  root.style.setProperty("--modal-bg", "#ffffff");
  root.style.setProperty("--input-bg", "#f5f5f7");
  root.style.setProperty("--input-border", "#e5e5e5"); // Assuming this is the light theme default
  root.style.setProperty("--border", "#e5e5e5"); // Assuming this is the light theme default
}