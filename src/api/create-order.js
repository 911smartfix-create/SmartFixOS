// src/api/create-order.js
import { db } from "./_db.js";

export default async function handler(req, res) {
  try {
    const { client, model, issue } = req.body;

    if (!client || !model) {
      return res.status(400).json({ error: "Faltan campos" });
    }

    const result = await db.query(
      "INSERT INTO orders (client, model, issue) VALUES ($1, $2, $3) RETURNING *",
      [client, model, issue || null]
    );

    res.json({ ok: true, order: result.rows[0] });
  } catch (err) {
    console.error("Error create-order:", err);
    res.status(500).json({ error: "Error creando orden" });
  }
}
