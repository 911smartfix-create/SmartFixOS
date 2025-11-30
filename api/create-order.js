import { db } from "./_db.js";
export default async function handler(req, res) {
  try {
    const { client, device, issue } = req.body;
    if (!client || !device) return res.status(400).json({ error: "Cliente y dispositivo requeridos" });
    const result = await db.query("INSERT INTO orders (client, device, issue) VALUES ($1,$2,$3) RETURNING *",[client, device, issue || null]);
    res.json({ ok: true, order: result.rows[0] });
  } catch (err) {
    console.error("❌ Error create-order:", err);
    res.status(500).json({ error: "Error creando orden" });
  }
}