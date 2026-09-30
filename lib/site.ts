// URL pública del sitio. Definir NEXT_PUBLIC_SITE_URL en producción (ej. https://encuestas.midominio.com).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
