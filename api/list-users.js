import { db } from "./_db.js";
export default async function handler(req, res) {
  try {
    const r = await db.query("SELECT * FROM users ORDER BY id DESC");
    res.json({ ok: true, users: r.rows });
  } catch (err) {
    console.error("❌ Error list-users:", err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
}