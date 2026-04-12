const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { CONFIG } = require("./config");

const comandos = [
  new SlashCommandBuilder()
    .setName("registrar_equipo")
    .setDescription("Registrar equipo")
    .addStringOption((o) => o.setName("nombre").setDescription("Nombre").setRequired(true))
    .addStringOption((o) => o.setName("emoji").setDescription("Emoji").setRequired(true))
    .addRoleOption((o) => o.setName("rol").setDescription("Rol").setRequired(true)),

  new SlashCommandBuilder()
    .setName("reto")
    .setDescription("Crear reto")
    .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
];

async function registrarComandos() {
  const rest = new REST({ version: "10" }).setToken(CONFIG.token);
  await rest.put(
    Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId),
    { body: comandos.map((c) => c.toJSON()) }
  );
}

module.exports = {
  registrarComandos
};
