import { Resend } from "resend";

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  if (!to) return console.warn("⚠️ No se especificó destinatario");
  try {
    const result = await resend.emails.send({
      from: "911 SmartFix <noreply@smartfixos.com>",
      to,
      subject,
      html,
    });
    console.log("✅ Email enviado correctamente:", result);
    return result;
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    throw error;
  }
}
