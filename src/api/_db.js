// src/api/_db.js
import { Pool } from "@neondatabase/serverless";

export const db = new Pool({
  connectionString: process.env.VITE_NEON_DATABASE_URL, // usa tu .env
});
