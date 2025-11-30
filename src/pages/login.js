// src/api/login.js
import { db } from "./_db.js";

export default async function handler(req, res) {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: "PIN requerido" });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE pin = $1 AND active = true LIMIT 1",
      [pin]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        error: "PIN incorrecto o usuario inactivo",
      });
    }

    const user = result.rows[0];

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno en login" });
  }
}
