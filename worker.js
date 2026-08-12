/**
 * Northwest Premier Yacht Management — contact form relay
 *
 * Receives a JSON POST from the site's contact form and emails it
 * to the business inbox using Resend (https://resend.com — free tier
 * covers a contact form easily, no card required for signup).
 *
 * Deploy this as a Cloudflare Worker, then set RELAY_URL in index.html
 * to this Worker's *.workers.dev URL (or a custom route once you have
 * a domain).
 *
 * Required Worker secret (set via `wrangler secret put RESEND_API_KEY`
 * or the Cloudflare dashboard -> Worker -> Settings -> Variables):
 *   RESEND_API_KEY   your Resend API key
 *
 * Optional Worker variables:
 *   TO_EMAIL         where inquiries are delivered (default below)
 *   FROM_EMAIL       verified sending address in Resend (default below)
 *   ALLOWED_ORIGIN   lock CORS to your site's origin once it's live
 */

const DEFAULT_TO_EMAIL = "Nwpyachtmanagement@gmail.com";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev"; // swap once a domain is verified in Resend

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Honeypot: silently accept but drop obvious bot submissions
    if (body._gotcha) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const name = (body.name || "").toString().trim().slice(0, 200);
    const email = (body.email || "").toString().trim().slice(0, 200);
    const phone = (body.phone || "").toString().trim().slice(0, 60);
    const vessel = (body.vessel || "").toString().trim().slice(0, 100);
    const issue = (body.issue || "").toString().trim().slice(0, 4000);

    if (!name || !email || !issue) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const escapeHtml = (s) =>
      s.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      }[c]));

    const html = `
      <h2>New inquiry — Northwest Premier Yacht Management</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || "—")}</p>
      <p><strong>Vessel size:</strong> ${escapeHtml(vessel || "—")}</p>
      <p><strong>Issue / request:</strong></p>
      <p>${escapeHtml(issue).replace(/\n/g, "<br>")}</p>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${(env.RESEND_API_KEY || "").trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || DEFAULT_FROM_EMAIL,
        to: [env.TO_EMAIL || DEFAULT_TO_EMAIL],
        reply_to: email,
        subject: `New inquiry from ${name} — NWPYM site`,
        html,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      return new Response(JSON.stringify({ error: "Email send failed", detail: errText }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  },
};
