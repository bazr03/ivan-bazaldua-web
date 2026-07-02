/**
 * Central site configuration — single source of truth for brand data,
 * contact details, and navigation. Edit here to update site-wide values.
 */

export const site = {
  name: "Iván Bazaldúa",
  title: "M.C. Geofísica Aplicada",
  tagline: "Soluciones especializadas en geología, geofísica y geotecnia",
  description:
    "Estudios geofísicos del subsuelo con métodos no invasivos para obra civil, minería y agua subterránea. Tomografía eléctrica, sísmica, MASW, georradar y más.",
  url: "https://ivanbazaldua.com",
  contact: {
    email: "contacto@ibazaldua.com",
    // International format, digits only, for wa.me links.
    whatsapp: "528211021129",
    // Pretty format for display.
    phoneDisplay: "+52 821 102 1129",
  },
} as const;

export const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "Proyectos", href: "/proyectos" },
  { label: "Sobre mí", href: "/sobre-mi" },
] as const;

export const whatsappLink = `https://wa.me/${site.contact.whatsapp}`;
export const whatsappPrefill = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(
  "Hola Iván, me interesa un estudio geofísico para mi proyecto.",
)}`;
