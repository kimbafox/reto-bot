const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { CONFIG } = require("./config");

const pool = new Pool({
  connectionString: CONFIG.databaseUrl
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipos (
      id BIGINT PRIMARY KEY,
      nombre TEXT NOT NULL,
      emoji TEXT NOT NULL,
      rol TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await migrarEquiposDesdeJson();
}

async function migrarEquiposDesdeJson() {
  const equiposPath = path.join(__dirname, "..", "equipos.json");
  if (!fs.existsSync(equiposPath)) return;

  let equipos = [];
  try {
    equipos = JSON.parse(fs.readFileSync(equiposPath, "utf8"));
  } catch {
    console.warn("No se pudo leer equipos.json para migracion. Se omite.");
    return;
  }

  if (!Array.isArray(equipos) || equipos.length === 0) return;

  for (const equipo of equipos) {
    if (!equipo || !equipo.id || !equipo.nombre || !equipo.emoji || !equipo.rol) {
      continue;
    }

    await pool.query(
      `
        INSERT INTO equipos (id, nombre, emoji, rol)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING;
      `,
      [String(equipo.id), equipo.nombre, equipo.emoji, equipo.rol]
    );
  }
}

module.exports = { pool, initDatabase };
