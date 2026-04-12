require("dotenv").config();

const REQUIRED_ENV_VARS = ["TOKEN", "CLIENT_ID", "GUILD_ID", "DATABASE_URL"];
const missingEnv = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Faltan variables de entorno: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const CONFIG = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  databaseUrl: process.env.DATABASE_URL,
  juegos: ["Valorant", "LoL", "Yu-Gi-Oh", "Rocket League", "CSGO"],
  modos: ["1vs1", "2vs2", "5vs5", "Personalizado"],
  horas: ["16", "17", "18", "19", "20", "21", "22", "23"],
  rolesPermitidos: ["1034277669359059055", "1452911512162140333"],
  tiempoLimiteMs: 60000
};

module.exports = { CONFIG };
