const { pool } = require("./db");

async function obtenerEquipos() {
  const { rows } = await pool.query("SELECT id, nombre, emoji, rol FROM equipos ORDER BY nombre ASC;");
  return rows.map((row) => ({
    id: Number(row.id),
    nombre: row.nombre,
    emoji: row.emoji,
    rol: row.rol
  }));
}

async function guardarEquipo({ nombre, emoji, rol }) {
  const id = Date.now();
  await pool.query(
    "INSERT INTO equipos (id, nombre, emoji, rol) VALUES ($1, $2, $3, $4);",
    [String(id), nombre, emoji, rol]
  );

  return id;
}

module.exports = {
  obtenerEquipos,
  guardarEquipo
};
