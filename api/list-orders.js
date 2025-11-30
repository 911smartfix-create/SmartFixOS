import { db } from "./_db.js";
export default async function handler(req, res) {
  try {
    const r = await db.query("SELECT * FROM orders ORDER BY id DESC");
    res.json({ ok: true, orders: r.rows });
  } catch (err) {
    console.error("❌ Error list-orders:", err);
    res.status(500).json({ error: "Error obteniendo órdenes" });
  }
}