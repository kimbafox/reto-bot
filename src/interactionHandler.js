const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");
const { CONFIG } = require("./config");
const { obtenerEquipos, guardarEquipo } = require("./equiposRepository");

function createInteractionHandler() {
  const retos = new Map();

  function getRetoOrReply(interaction, retadorId) {
    const data = retos.get(retadorId);
    if (!data) {
      interaction.reply({ content: "Este reto ya no esta disponible.", ephemeral: true }).catch(() => {});
      return null;
    }

    return data;
  }

  return async function onInteraction(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "registrar_equipo") {
          const tienePermiso = CONFIG.rolesPermitidos.some((roleId) =>
            interaction.member.roles.cache.has(roleId)
          );

          if (!tienePermiso) {
            return interaction.reply({
              content: "Solo el ADMIN SUPREMO puede crear equipos.",
              ephemeral: true
            });
          }

          const nombre = interaction.options.getString("nombre", true).trim();
          const emoji = interaction.options.getString("emoji", true).trim();
          const rol = interaction.options.getRole("rol", true);

          const equipos = await obtenerEquipos();
          const yaExiste = equipos.some(
            (e) => e.nombre.toLowerCase() === nombre.toLowerCase() || e.rol === rol.id
          );

          if (yaExiste) {
            return interaction.reply({
              content: "Ya existe un equipo con ese nombre o con ese rol.",
              ephemeral: true
            });
          }

          await guardarEquipo({ nombre, emoji, rol: rol.id });

          return interaction.reply(`Equipo registrado: ${emoji} ${nombre}`);
        }

        if (interaction.commandName === "reto") {
          const retado = interaction.options.getUser("usuario", true);

          if (retado.id === interaction.user.id) {
            return interaction.reply({
              content: "No puedes retarte a ti mismo.",
              ephemeral: true
            });
          }

          const equipos = await obtenerEquipos();
          const equiposValidos = equipos.filter((e) => interaction.member.roles.cache.has(e.rol));

          if (equiposValidos.length === 0) {
            return interaction.reply({ content: "No tienes equipo registrado.", ephemeral: true });
          }

          const menu = new StringSelectMenuBuilder()
            .setCustomId(`equipo:${retado.id}`)
            .setPlaceholder("Selecciona tu equipo")
            .addOptions(
              equiposValidos.map((e) => ({
                label: e.nombre,
                value: String(e.id),
                emoji: e.emoji
              }))
            );

          return interaction.reply({
            content: "Selecciona tu equipo para el desafio.",
            components: [new ActionRowBuilder().addComponents(menu)]
          });
        }
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("equipo:")) {
        const retadoId = interaction.customId.split(":")[1];
        const equipoId = interaction.values[0];

        retos.set(interaction.user.id, {
          retadoId,
          equipoId,
          retadorId: interaction.user.id,
          retadorNombre: interaction.user.username,
          estado: "pendiente"
        });

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`juego:${interaction.user.id}`)
          .setPlaceholder("Selecciona el juego")
          .addOptions(CONFIG.juegos.map((j) => ({ label: j, value: j })));

        return interaction.update({
          content: "Selecciona el juego.",
          components: [new ActionRowBuilder().addComponents(menu)]
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("juego:")) {
        const retadorId = interaction.customId.split(":")[1];
        if (interaction.user.id !== retadorId) {
          return interaction.reply({ content: "Solo el retador puede continuar este flujo.", ephemeral: true });
        }

        const data = getRetoOrReply(interaction, retadorId);
        if (!data) return;

        data.juego = interaction.values[0];

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`modo:${retadorId}`)
          .setPlaceholder("Selecciona el modo")
          .addOptions(CONFIG.modos.map((m) => ({ label: m, value: m })));

        return interaction.update({
          content: "Selecciona el modo.",
          components: [new ActionRowBuilder().addComponents(menu)]
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("modo:")) {
        const retadorId = interaction.customId.split(":")[1];
        if (interaction.user.id !== retadorId) {
          return interaction.reply({ content: "Solo el retador puede continuar este flujo.", ephemeral: true });
        }

        const data = getRetoOrReply(interaction, retadorId);
        if (!data) return;

        data.modo = interaction.values[0];

        const menu = new StringSelectMenuBuilder()
          .setCustomId(`hora:${retadorId}`)
          .setPlaceholder("Selecciona la hora")
          .addOptions(CONFIG.horas.map((h) => ({ label: `${h}:00`, value: h })));

        return interaction.update({
          content: "Selecciona la hora.",
          components: [new ActionRowBuilder().addComponents(menu)]
        });
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("hora:")) {
        const retadorId = interaction.customId.split(":")[1];
        if (interaction.user.id !== retadorId) {
          return interaction.reply({ content: "Solo el retador puede continuar este flujo.", ephemeral: true });
        }

        const data = getRetoOrReply(interaction, retadorId);
        if (!data) return;

        const hora = Number.parseInt(interaction.values[0], 10);
        const fecha = new Date();
        if (new Date().getHours() >= hora) {
          fecha.setDate(fecha.getDate() + 1);
        }

        data.hora = hora;
        data.fecha = fecha.toLocaleDateString();

        const embed = new EmbedBuilder()
          .setTitle("DESAFIO OCL")
          .setColor(0x00ffff)
          .setImage("attachment://reto.png")
          .addFields(
            { name: "Retador", value: interaction.user.username, inline: true },
            { name: "Juego", value: data.juego, inline: true },
            { name: "Modo", value: data.modo, inline: true },
            { name: "Hora", value: `${hora}:00`, inline: true },
            { name: "Fecha", value: data.fecha, inline: true },
            { name: "Estado", value: "Esperando aceptacion..." }
          );

        await interaction.update({
          content: `<@${data.retadoId}> has sido retado!`,
          embeds: [embed],
          files: [new AttachmentBuilder("./assets/reto.png")],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`aceptar:${data.retadorId}:${data.retadoId}`)
                .setLabel("Aceptar")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`rechazar:${data.retadorId}:${data.retadoId}`)
                .setLabel("Rechazar")
                .setStyle(ButtonStyle.Danger)
            )
          ]
        });

        retos.set(data.retadoId, data);
        retos.set(data.retadorId, data);

        setTimeout(async () => {
          const retoActual = retos.get(data.retadoId);
          if (!retoActual || retoActual.estado !== "pendiente") {
            return;
          }

          const msg = await interaction.fetchReply().catch(() => null);
          if (msg) {
            await msg
              .edit({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("TIEMPO AGOTADO")
                    .setDescription("El reto expiro sin respuesta.")
                    .setColor(0xff0000)
                ],
                components: []
              })
              .catch(() => {});
          }

          retos.delete(data.retadoId);
          retos.delete(data.retadorId);
        }, CONFIG.tiempoLimiteMs);
      }

      if (interaction.isButton() && interaction.customId.startsWith("aceptar:")) {
        const [, retadorId, retadoId] = interaction.customId.split(":");

        if (interaction.user.id !== retadoId) {
          return interaction.reply({ content: "Solo el retado puede aceptar.", ephemeral: true });
        }

        const data = retos.get(retadoId);
        if (!data) {
          return interaction.reply({ content: "Este reto ya no esta disponible.", ephemeral: true });
        }

        const equipos = await obtenerEquipos();
        const equipoRetador = equipos.find((e) => String(e.id) === String(data.equipoId));
        const equipoRetado = equipos.find((e) => interaction.member.roles.cache.has(e.rol));

        if (!equipoRetador || !equipoRetado) {
          return interaction.reply({
            content: "No se pudo resolver el equipo retador o local.",
            ephemeral: true
          });
        }

        data.estado = "aceptado";

        const embed = new EmbedBuilder()
          .setTitle("MATCH CONFIRMADO")
          .setColor(0x39ff14)
          .setImage("attachment://planificacion.png")
          .addFields(
            { name: "RETADOR", value: `<@${retadorId}> (${equipoRetador.nombre})`, inline: false },
            { name: "LOCAL", value: `<@${retadoId}> (${equipoRetado.nombre})`, inline: false },
            { name: "Juego", value: data.juego, inline: true },
            { name: "Modo", value: data.modo, inline: true },
            { name: "Hora", value: `${data.hora}:00`, inline: true },
            { name: "Fecha", value: data.fecha, inline: true }
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
          const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
          if (!role) return;

          for (const member of role.members.values()) {
            if (enviados.has(member.id)) continue;
            enviados.add(member.id);

            await member
              .send({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("PARTIDA PROGRAMADA")
                    .setColor(0x00bfff)
                    .setDescription("[OCL MATCH READY]")
                    .addFields(
                      { name: "Rol", value: titulo, inline: false },
                      { name: "Juego", value: data.juego, inline: true },
                      { name: "Modo", value: data.modo, inline: true },
                      { name: "Hora", value: `${data.hora}:00`, inline: true },
                      { name: "Fecha", value: data.fecha, inline: true }
                    )
                    .setFooter({ text: "OCL Competitive System" })
                    .setTimestamp()
                ]
              })
              .catch(() => {});
          }
        };

        await enviarDM(equipoRetador.rol, "Tu equipo es RETADOR");
        await enviarDM(equipoRetado.rol, "Tu equipo es LOCAL");
      }

      if (interaction.isButton() && interaction.customId.startsWith("rechazar:")) {
        const [, retadorId, retadoId] = interaction.customId.split(":");

        if (interaction.user.id !== retadoId) {
          return interaction.reply({ content: "Solo el retado puede rechazar.", ephemeral: true });
        }

        const data = retos.get(retadoId);
        if (!data) {
          return interaction.reply({ content: "Este reto ya no esta disponible.", ephemeral: true });
        }

        data.estado = "rechazado";

        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setTitle("RETO RECHAZADO")
              .setColor(0xff3300)
              .setDescription(`<@${retadoId}> rechazo el desafio de <@${retadorId}>.`)
          ],
          components: []
        });

        retos.delete(retadoId);
        retos.delete(retadorId);
      }
    } catch (error) {
      console.error("Error en interactionCreate:", error);

      if (interaction.deferred || interaction.replied) {
        await interaction
          .followUp({
            content: "Ocurrio un error procesando la solicitud.",
            ephemeral: true
          })
          .catch(() => {});
        return;
      }

      await interaction
        .reply({
          content: "Ocurrio un error procesando la solicitud.",
          ephemeral: true
        })
        .catch(() => {});
    }
  };
}

module.exports = { createInteractionHandler };
