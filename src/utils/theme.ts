export function applyTenantTheme(tenant?: any) {
  const root = document.documentElement;

  const primary = tenant?.primary_color ?? "#ff1493";
  const secondary = tenant?.secondary_color ?? "#ffffff";
  const variant = tenant?.theme_variant ?? "light";

  // Main brand colors
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-secondary", secondary);

  // Theme
  root.dataset.theme = variant;

  // Dynamic text colors
  root.style.setProperty("--text-color", variant === "dark" ? "#f5f5f5" : "#222");
  root.style.setProperty("--text-muted", variant === "dark" ? "#bbbbbb" : "#555");

  // Dynamic surfaces
  root.style.setProperty("--surface", variant === "dark" ? "#121212" : "#ffffff");
  root.style.setProperty("--surface-alt", variant === "dark" ? "#1f1f1f" : "#f6f6f6");

  // Inputs and borders
  root.style.setProperty(
    "--input-bg",
    variant === "dark" ? "#1a1a1a" : "#ffffff"
  );
  root.style.setProperty(
    "--input-border",
    variant === "dark" ? "#444" : "#ccc"
  );

  // Shadows adapt to theme
  root.style.setProperty(
    "--shadow-color",
    variant === "dark" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.15)"
  );
}
