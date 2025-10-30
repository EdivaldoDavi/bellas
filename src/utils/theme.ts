export function applyTenantTheme(tenant?: any) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', tenant?.primary_color || '#ff1493');
  root.style.setProperty('--color-secondary', tenant?.secondary_color || '#ffffff');
  root.dataset.theme = tenant?.theme_variant || 'light';
}
