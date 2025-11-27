import { Resend } from 'resend';

export default async function handler(req, res) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { to, subject, html } = req.body;

    const data = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject,
      html,
    });

    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    res.status(500).json({ ok: false, error });
  }
}
