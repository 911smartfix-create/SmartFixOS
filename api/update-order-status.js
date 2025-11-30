import { db } from "./_db.js";
export default async function handler(req, res) {
  try {
    const { id, status } = req.body;
    if (!id || !status) return res.status(400).json({ error: "ID y estatus requeridos" });
    const r = await db.query("UPDATE orders SET status=$1 WHERE id=$2 RETURNING *",[status, id]);
    res.json({ ok: true, order: r.rows[0] });
  } catch (err) {
    console.error("❌ Error update-order:", err);
    res.status(500).json({ error: "Error actualizando estatus" });
  }
}