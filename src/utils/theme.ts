// src/utils/theme.ts
import type { Tenant } from "../hooks/useUserAndTenant";

export function applyTenantTheme(tenant?: Tenant | null) {
  const root = document.documentElement;

  const primary = tenant?.primary_color ?? "#ff1493";
  const secondary = tenant?.secondary_color ?? "#ffffff";
  const variant = (tenant?.theme_variant as "light" | "dark") ?? "light";

  // Cores principais
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-secondary", secondary);

  // Variant global
  root.dataset.theme = variant;

  // Texto
  root.style.setProperty(
    "--text-color",
    variant === "dark" ? "#f5f5f5" : "#222222"
  );
  root.style.setProperty(
    "--text-muted",
    variant === "dark" ? "#bfbfbf" : "#555555"
  );

  // Superfícies
  root.style.setProperty(
    "--surface",
    variant === "dark" ? "#121212" : "#ffffff"
  );
  root.style.setProperty(
    "--surface-alt",
    variant === "dark" ? "#1f1f1f" : "#f6f6f6"
  );

  // Inputs
  root.style.setProperty(
    "--input-bg",
    variant === "dark" ? "#1a1a1a" : "#ffffff"
  );
  root.style.setProperty(
    "--input-border",
    variant === "dark" ? "#444444" : "#cccccc"
  );

  // Sombra
  root.style.setProperty(
    "--shadow-color",
    variant === "dark" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.15)"
  );
}
