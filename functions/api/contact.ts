const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export async function onRequest({ request, env }) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let name: string, email: string, message: string, phone: string, sector: string, botcheck: string | null;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      name = body.name?.trim();
      email = body.email?.trim();
      message = body.message?.trim();
      phone = body.phone?.trim() ?? "";
      sector = body.sector?.trim() ?? "";
      botcheck = body.botcheck ? String(body.botcheck) : null;
    } else {
      const formData = await request.formData();
      name = formData.get("name")?.toString().trim() ?? "";
      email = formData.get("email")?.toString().trim() ?? "";
      message = formData.get("message")?.toString().trim() ?? "";
      phone = formData.get("phone")?.toString().trim() ?? "";
      sector = formData.get("sector")?.toString().trim() ?? "";
      botcheck = formData.get("botcheck")?.toString() ?? null;
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Error parsing form data" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  // Honeypot check (captured during body parse above)
  if (botcheck) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  // Validate required fields
  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ error: "Name, email, and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: "Invalid email format" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  // Send email via Resend
  const resendApiKey = env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("RESEND_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const sectorLine = sector ? `\n<strong>Tipo de proyecto:</strong> ${escapeHtml(sector)}` : "";
  const phoneLine = phone ? `\n<strong>Teléfono:</strong> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>` : "";

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Sitio Web <contacto@ibazaldua.com>",
      to: ["contacto@ibazaldua.com"],
      reply_to: email,
      subject: `Nueva consulta desde el sitio web — ${name}`,
      html: `
        <strong>Nombre:</strong> ${escapeHtml(name)}<br/>
        <strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>${phoneLine}${sectorLine}
        <hr/>
        <strong>Mensaje:</strong><br/>
        <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `,
      text: `Nombre: ${name}\nEmail: ${email}${phone ? `\nTeléfono: ${phone}` : ""}${sector ? `\nTipo de proyecto: ${sector}` : ""}\n\nMensaje:\n${message}`,
    }),
  });

  if (!resendResponse.ok) {
    const errorData = await resendResponse.text();
    console.error("Resend API error:", errorData);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
}
