import { db } from "./_db.js";
export default async function handler(req, res) {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Nombre y email requeridos" });
    const result = await db.query("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",[name, email]);
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error("❌ Error create-user:", err);
    res.status(500).json({ error: "Error creando usuario" });
  }
}