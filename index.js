require("dotenv").config();
const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

const equiposPath = path.join(__dirname, "equipos.json");

// ===== JSON SEGURO =====
function obtenerEquipos() {
  try {
    if (!fs.existsSync(equiposPath)) fs.writeFileSync(equiposPath, "[]");
    return JSON.parse(fs.readFileSync(equiposPath));
  } catch {
    fs.writeFileSync(equiposPath, "[]");
    return [];
  }
}

function guardarEquipos(data) {
  fs.writeFileSync(equiposPath, JSON.stringify(data, null, 2));
}

// ===== CONFIG =====
const JUEGOS = ["Valorant","LoL","Yu-Gi-Oh","Rocket League","CSGO"];
const MODOS = ["1vs1","2vs2","5vs5","Personalizado"];
const HORAS = ["16","17","18","19","20","21","22","23"];
const retos = new Map();
const TIEMPO_LIMITE = 60000;

// ===== COMANDOS =====
const comandos = [
  new SlashCommandBuilder()
    .setName("registrar_equipo")
    .setDescription("Registrar equipo")
    .addStringOption(o=>o.setName("nombre").setDescription("Nombre").setRequired(true))
    .addStringOption(o=>o.setName("emoji").setDescription("Emoji").setRequired(true))
    .addRoleOption(o=>o.setName("rol").setDescription("Rol").setRequired(true)),

  new SlashCommandBuilder()
    .setName("reto")
    .setDescription("Crear reto")
    .addUserOption(o=>o.setName("usuario").setDescription("Usuario").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: comandos }
  );
})();

client.once("ready", () => {
  console.log("🤖 BOT OCL ACTIVO");
});

// ===== INTERACCIONES =====
client.on("interactionCreate", async interaction => {

  // ===== REGISTRAR =====
  if (interaction.isChatInputCommand() && interaction.commandName === "registrar_equipo") {
    const nombre = interaction.options.getString("nombre");
    const emoji = interaction.options.getString("emoji");
    const rol = interaction.options.getRole("rol");

    const equipos = obtenerEquipos();
    equipos.push({ id: Date.now(), nombre, emoji, rol: rol.id });
    guardarEquipos(equipos);

    return interaction.reply(`✅ ${emoji} ${nombre} registrado`);
  }

  // ===== RETO =====
  if (interaction.isChatInputCommand() && interaction.commandName === "reto") {

    const retado = interaction.options.getUser("usuario");
    const equipos = obtenerEquipos();

    const equiposValidos = equipos.filter(e =>
      interaction.member.roles.cache.has(e.rol)
    );

    if (equiposValidos.length === 0)
      return interaction.reply("❌ No tienes equipo");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`equipo_${retado.id}`)
      .setPlaceholder("Selecciona tu equipo")
      .addOptions(equiposValidos.map(e => ({
        label: e.nombre,
        value: e.id.toString(),
        emoji: e.emoji
      })));

    return interaction.reply({
      content: "⚔️ **Selecciona tu equipo para el desafío**",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // ===== EQUIPO =====
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("equipo_")) {

    const retadoId = interaction.customId.split("_")[1];
    const equipoId = interaction.values[0];

    retos.set(interaction.user.id, {
      retadoId,
      equipoId,
      retadorNombre: interaction.user.username,
      retadorId: interaction.user.id
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("juego")
      .addOptions(JUEGOS.map(j => ({ label: j, value: j })));

    return interaction.update({
      content: "🎮 **Selecciona el juego**",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // ===== JUEGO =====
  if (interaction.isStringSelectMenu() && interaction.customId === "juego") {
    retos.get(interaction.user.id).juego = interaction.values[0];

    const menu = new StringSelectMenuBuilder()
      .setCustomId("modo")
      .addOptions(MODOS.map(m => ({ label: m, value: m })));

    return interaction.update({
      content: "⚙️ **Selecciona el modo**",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // ===== MODO =====
  if (interaction.isStringSelectMenu() && interaction.customId === "modo") {
    retos.get(interaction.user.id).modo = interaction.values[0];

    const menu = new StringSelectMenuBuilder()
      .setCustomId("hora")
      .addOptions(HORAS.map(h => ({ label: `${h}:00`, value: h })));

    return interaction.update({
      content: "⏰ **Selecciona la hora**",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // ===== HORA =====
  if (interaction.isStringSelectMenu() && interaction.customId === "hora") {

    const data = retos.get(interaction.user.id);
    const hora = parseInt(interaction.values[0]);

    let fecha = new Date();
    if (new Date().getHours() >= hora) fecha.setDate(fecha.getDate() + 1);

    data.hora = hora;
    data.fecha = fecha.toLocaleDateString();

    const embed = new EmbedBuilder()
      .setTitle("⚡ DESAFÍO OCL")
      .setColor(0x00FFFF)
      .setImage("attachment://reto.png")
      .addFields(
        { name: "👤 Retador", value: interaction.user.username, inline: true },
        { name: "🎮 Juego", value: data.juego, inline: true },
        { name: "⚙️ Modo", value: data.modo, inline: true },
        { name: "🕓 Hora", value: `${hora}:00`, inline: true },
        { name: "📅 Fecha", value: data.fecha, inline: true },
        { name: "Estado", value: "Esperando aceptación..." }
      );

    await interaction.update({
      
          content: `🚨 <@${data.retadoId}> has sido retado!`,
          embeds: [embed],
          files: [new AttachmentBuilder("./assets/reto.png")],
          components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aceptar_${interaction.user.id}_${data.retadoId}`)
            .setLabel("Aceptar")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rechazar_${interaction.user.id}_${data.retadoId}`)
            .setLabel("Rechazar")
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });

    retos.set(data.retadoId, data);

    setTimeout(async () => {
      if (!retos.has(data.retadoId)) return;

      const msg = await interaction.fetchReply().catch(()=>null);
      if (!msg) return;

      msg.edit({
        embeds: [new EmbedBuilder().setTitle("⏱️ TIEMPO AGOTADO").setDescription("El reto expiró.")],
        components: []
      });

      retos.delete(data.retadoId);
    }, TIEMPO_LIMITE);
  }

  // ===== ACEPTAR =====
  if (interaction.isButton() && interaction.customId.startsWith("aceptar")) {

    const [_, retadorId, retadoId] = interaction.customId.split("_");

    if (interaction.user.id !== retadoId)
      return interaction.reply({ content: "❌ Solo el retado puede aceptar", ephemeral: true });

    const data = retos.get(retadoId);
    const equipos = obtenerEquipos();

    const equipoRetador = equipos.find(e => e.id == data.equipoId);
    const equipoRetado = equipos.find(e => interaction.member.roles.cache.has(e.rol));

    const embed = new EmbedBuilder()
      .setTitle("🔥 MATCH CONFIRMADO")
      .setColor(0x39FF14)
      .setImage("attachment://planificacion.png")
      .addFields(
        { name: "⚔️ RETADOR", value: `<@${retadorId}> (${equipoRetador.nombre})`, inline: false },
        { name: "🏠 LOCAL", value: `<@${retadoId}> (${equipoRetado.nombre})`, inline: false },
        { name: "🎮 Juego", value: data.juego, inline: true },
        { name: "⚙️ Modo", value: data.modo, inline: true },
        { name: "🕓 Hora", value: `${data.hora}:00`, inline: true },
        { name: "📅 Fecha", value: data.fecha, inline: true }
      );

    await interaction.update({
      embeds: [embed],
      files: [new AttachmentBuilder("./assets/planificacion.png")],
      components: []
    });

    retos.delete(retadoId);
    retos.delete(retadorId);

    const enviados = new Set();

    const enviarDM = async (roleId, titulo) => {
      const role = await interaction.guild.roles.fetch(roleId);

      role.members.forEach(m => {
        if (enviados.has(m.id)) return;
        enviados.add(m.id);

        m.send({
  embeds: [
    new EmbedBuilder()
      .setTitle("📢 PARTIDA PROGRAMADA")
      .setColor(0x00BFFF)
      .setDescription("```ini\n[OCL MATCH READY]\n```")
      .addFields(
        { name: "🏷️ Rol", value: titulo, inline: false },
        { name: "🎮 Juego", value: `>>> ${data.juego}`, inline: true },
        { name: "⚙️ Modo", value: `>>> ${data.modo}`, inline: true },
        { name: "🕓 Hora", value: `>>> ${data.hora}:00`, inline: true },
        { name: "📅 Fecha", value: `>>> ${data.fecha}`, inline: true }
      )
      .setFooter({ text: "OCL Competitive System ⚔️" })
      .setTimestamp()
  ]
}).catch(()=>{});
      });
    };

    await enviarDM(equipoRetador.rol, "Tu equipo es RETADOR");
    await enviarDM(equipoRetado.rol, "Tu equipo es LOCAL");
  }

});

client.login(process.env.TOKEN);