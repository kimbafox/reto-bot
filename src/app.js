const { Client, GatewayIntentBits } = require("discord.js");
const { CONFIG } = require("./config");
const { initDatabase, pool } = require("./db");
const { registrarComandos } = require("./commands");
const { createInteractionHandler } = require("./interactionHandler");

async function startApp() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages
    ]
  });

  client.once("ready", () => {
    console.log("BOT OCL activo y conectado");
  });

  client.on("interactionCreate", createInteractionHandler());

  process.on("unhandledRejection", (reason) => {
    console.error("unhandledRejection:", reason);
  });

  process.on("SIGINT", async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });

  await initDatabase();
  await registrarComandos();
  await client.login(CONFIG.token);
}

module.exports = { startApp };
