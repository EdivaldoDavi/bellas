import type { Tenant } from "../hooks/useUserAndTenant";

export function applyTenantTheme(tenant?: Tenant | null) {
  const root = document.documentElement;

  const primary = tenant?.primary_color ?? "#ff1493"; // Default primary color
  const secondary = tenant?.secondary_color ?? "#ffffff"; // Default secondary color
  const variant = (tenant?.theme_variant as "light" | "dark") ?? "light"; // Default theme variant

  // Set the global theme variant attribute
  root.dataset.theme = variant;

  // Set primary and secondary colors as CSS variables
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-secondary", secondary);
  root.style.setProperty("--sidebar-primary", primary); // Used in Sidebar.tsx
  root.style.setProperty("--color-primary-hover", primary + "cc"); // Consistent hover effect

  // Define base colors based on theme variant
  if (variant === "dark") {
    root.style.setProperty("--bg", "#0f0f0f");
    root.style.setProperty("--text", "#f5f5f5");
    root.style.setProperty("--text-muted", "#aaaaaa");
    root.style.setProperty("--separator", "#333333");
    root.style.setProperty("--card-bg", "#1c1c1c");
    root.style.setProperty("--card-alt-bg", "#2a2a2a");
    root.style.setProperty("--sidebar-bg", "#111111");
    root.style.setProperty("--header-bg", "#101010");
    root.style.setProperty("--theme-invert", "1");

    // Specific variables used in Setup.module.css and other places
    root.style.setProperty("--text-color", "#f5f5f5");
    root.style.setProperty("--text-secondary", "#d0d0d0");
    root.style.setProperty("--input-bg", "#1a1a1a");
    root.style.setProperty("--input-border", "#3a3a3a");
    root.style.setProperty("--modal-bg", "#0f0f0f");
    root.style.setProperty("--label-color", "#eeeeee");
    root.style.setProperty("--page-bg", "#0f0f0f"); // For onboarding page
  } else { // light theme
    root.style.setProperty("--bg", "#ffffff");
    root.style.setProperty("--text", "#111111");
    root.style.setProperty("--text-muted", "#666666");
    root.style.setProperty("--separator", "#e5e5e5");
    root.style.setProperty("--card-bg", "#ffffff");
    root.style.setProperty("--card-alt-bg", "#f9f9fa");
    root.style.setProperty("--sidebar-bg", "#ffffff");
    root.style.setProperty("--header-bg", "#ffffff");
    root.style.setProperty("--theme-invert", "0");

    // Specific variables used in Setup.module.css and other places
    root.style.setProperty("--text-color", "#222222");
    root.style.setProperty("--text-secondary", "#6b7280");
    root.style.setProperty("--input-bg", "#ffffff");
    root.style.setProperty("--input-border", "#cccccc");
    root.style.setProperty("--modal-bg", "#ffffff");
    root.style.setProperty("--label-color", "#111111");
    root.style.setProperty("--page-bg", "#f7f6fb"); // For onboarding page
  }
}