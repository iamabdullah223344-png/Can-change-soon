
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const PREFIX = "$";

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// Parse giveaway duration: 10s, 5m, 2h, 1d
function parseDuration(input) {
  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const units = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  const duration =
    amount * units[match[2].toLowerCase()];

  if (
    !Number.isSafeInteger(duration) ||
    duration < 1000 ||
    duration > 30 * 86400000
  ) return null;

  return duration;
}

// ALL PREFIX COMMANDS USE THIS SAME HANDLER
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content
      .slice(PREFIX.length)
      .trim()
      .split(/\s+/);

    const command = args.shift()?.toLowerCase();

    // PING
    if (command === "ping") {
      return message.reply(
        `🏓 Pong! ${client.ws.ping}ms`
      );
    }

    // GIVEAWAY
    if (command === "giveaway") {
      if (!message.member.permissions.has(
        PermissionFlagsBits.ManageGuild
      )) {
        return message.reply(
          "❌ You need Manage Server permission."
        );
      }

      const duration = parseDuration(args[0] || "");
      const prize = args.slice(1).join(" ");

      if (!duration || !prize) {
        return message.reply(
          "Usage: `$giveaway 10m Nitro`"
        );
      }

      const endTime = Date.now() + duration;

      const embed = new EmbedBuilder()
        .setColor(0xE91E63)
        .setTitle("🎉 GIVEAWAY 🎉")
        .setDescription(
          `**Prize:** ${prize}\n\n` +
          "React with 🎉 to enter!\n\n" +
          `**Hosted by:** ${message.author}\n` +
          `**Ends:** <t:${Math.floor(endTime / 1000)}:R>`
        )
        .setTimestamp(endTime);

      const giveaway = await message.channel.send({
        embeds: [embed]
      });

      await giveaway.react("🎉");
      await message.reply("✅ Giveaway started!");

      setTimeout(async () => {
        try {
          const reaction =
            giveaway.reactions.cache.get("🎉");

          if (!reaction) {
            return giveaway.reply(
              "Giveaway ended, but no entries were found."
            );
          }

          const users = await reaction.users.fetch();
          const entrants = users.filter(user => !user.bot);

          if (!entrants.size) {
            return giveaway.reply(
              "🎉 Giveaway ended! Nobody entered."
            );
          }

          const winner = entrants.random();

          const endedEmbed = EmbedBuilder.from(embed)
            .setTitle("🎉 GIVEAWAY ENDED 🎉")
            .setColor(0x2ECC71)
            .setDescription(
              `**Prize:** ${prize}\n\n` +
              `**Winner:** ${winner}\n` +
              `**Hosted by:** ${message.author}`
            );

          await giveaway.edit({ embeds: [endedEmbed] });
          await giveaway.reply(
            `🎊 Congratulations ${winner}! You won **${prize}**!`
          );
        } catch (error) {
          console.error("Giveaway error:", error);
        }
      }, duration);

      return;
    }

    // TICKET PANEL
    if (command === "ticketpanel") {
      if (!message.member.permissions.has(
        PermissionFlagsBits.ManageGuild
      )) {
        return message.reply(
          "❌ You need Manage Server permission."
        );
      }

      const embed = new EmbedBuilder()
        .setColor(0x8A2BE2)
        .setTitle("🎫 NIGHTBLOOM SUPPORT")
        .setDescription(
          "Need help? Click the button below to open a private ticket.\n\n" +
          "• Be respectful to staff.\n" +
          "• Explain your issue clearly.\n" +
          "• Do not open unnecessary tickets."
        )
        .setFooter({ text: "Support Team • Nightbloom" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Create Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({
        embeds: [embed],
        components: [row]
      });

      return message.reply("✅ Ticket panel created!");
    }
  } catch (error) {
    console.error("Command error:", error);
    await message.reply(
      "❌ Command failed. Check the Railway logs."
    ).catch(() => {});
  }
});

// TICKET BUTTONS
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    // OPEN TICKET
    if (interaction.customId === "create_ticket") {
      const guild = interaction.guild;
      if (!guild) {
        return interaction.reply({
          content: "This button only works in a server.",
          ephemeral: true
        });
      }

      const existing = guild.channels.cache.find(channel =>
        channel.type === ChannelType.GuildText &&
        channel.topic === `ticket-owner:${interaction.user.id}`
      );

      if (existing) {
        return interaction.reply({
          content: `You already have a ticket: ${existing}`,
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const safeName = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 20) || "user";

      const channel = await guild.channels.create({
        name: `ticket-${safeName}`,
        type: ChannelType.GuildText,
        topic: `ticket-owner:${interaction.user.id}`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels
            ]
          }
        ]
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content:
          `Welcome ${interaction.user}!\n` +
          "Please explain your issue. Staff will help you soon.",
        components: [closeRow]
      });

      return interaction.editReply(
        `✅ Your private ticket is ready: ${channel}`
      );
    }

    // CLOSE TICKET
    if (interaction.customId === "close_ticket") {
      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.reply({
          content: "This is not a ticket channel.",
          ephemeral: true
        });
      }

      const isOwner =
        channel.topic === `ticket-owner:${interaction.user.id}`;

      const isStaff =
        interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageChannels
        );

      if (!isOwner && !isStaff) {
        return interaction.reply({
          content: "❌ Only the ticket owner or staff can close this ticket.",
          ephemeral: true
        });
      }

      await interaction.reply({
        content: "🔒 Closing ticket in 3 seconds..."
      });

      setTimeout(async () => {
        try {
          await channel.delete("Ticket closed");
        } catch (error) {
          console.error("Ticket close error:", error);
        }
      }, 3000);
    }
  } catch (error) {
    console.error("Ticket error:", error);

    const reply = {
      content: "❌ Ticket action failed. Check bot permissions.",
      ephemeral: true
    };

    if (interaction.deferred) {
      await interaction.editReply(reply).catch(() => {});
    } else if (!interaction.replied) {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

// LOGIN
client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("Bot login failed:", error);
});
