// src/utils/emailClient.js

export async function sendSmartfixEmail({ to, subject, html }) {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html }),
  });

  if (!res.ok) {
    let msg = "Error al enviar el email";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch (e) {}
    throw new Error(msg);
  }

  return res.json();
}
