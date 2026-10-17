
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const PREFIX = "$";
const giveaways = new Map();

function durationMs(value) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(value || "");
  if (!match) return null;

  const amount = Number(match[1]);
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const duration = amount * units[match[2].toLowerCase()];

  if (!Number.isSafeInteger(duration) ||
      duration < 10000 ||
      duration > 20 * 86400000) return null;

  return duration;
}

async function finishGiveaway(channel, id, reroll = false) {
  const data = giveaways.get(id);

  // Only active giveaways created by this running process are stored.
  if (!data) {
    if (reroll) throw new Error("Giveaway not found in this bot session.");
    return;
  }

  const msg = await channel.messages.fetch(id);
  const reaction = msg.reactions.cache.get("🎉");
  const users = reaction ? await reaction.users.fetch() : new Map();

  const entrants = [...users.values()].filter(u => !u.bot);
  const pool = [...entrants];
  const winners = [];

  while (pool.length && winners.length < data.winnerCount) {
    winners.push(pool.splice(
      Math.floor(Math.random() * pool.length), 1
    )[0]);
  }

  if (!reroll) {
    data.ended = true;
    clearTimeout(data.timer);
  }

  const result = winners.length
    ? winners.map(u => `<@${u.id}>`).join(", ")
    : "No eligible entrants.";

  await channel.send(
    `🎉 **${reroll ? "Giveaway reroll" : "Giveaway ended"}!**\n` +
    `Prize: **${data.prize}**\nWinner(s): ${result}`
  );

  if (!reroll) giveaways.delete(id);
}

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot ||
      !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();

  try {
    // PING / PONG
    if (command === "ping" || command === "pong") {
      return message.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }

    // CREATE GIVEAWAY: $giveaway 10m 1 Nitro
    if (command === "giveaway") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ You need Manage Server permission.");
      }

      const duration = durationMs(args[0]);
      const winnerCount = Number(args[1]);
      const prize = args.slice(2).join(" ");

      if (!duration || !Number.isInteger(winnerCount) ||
          winnerCount < 1 || winnerCount > 20 || !prize) {
        return message.reply("Usage: `$giveaway 10m 1 Nitro`");
      }

      const end = Date.now() + duration;
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle("🎉 GIVEAWAY")
        .setDescription(
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winnerCount}\n` +
          `**Hosted by:** ${message.author}\n\nReact with 🎉 to enter!`
        )
        .addFields({
          name: "Ends",
          value: `<t:${Math.floor(end / 1000)}:R>`
        });

      const giveawayMessage = await message.channel.send({ embeds: [embed] });
      await giveawayMessage.react("🎉");

      const data = {
        prize,
        winnerCount,
        ended: false,
        timer: null
      };

      data.timer = setTimeout(async () => {
        try {
          await finishGiveaway(message.channel, giveawayMessage.id);
        } catch (err) {
          console.error("Giveaway ending error:", err);
        }
      }, duration);

      giveaways.set(giveawayMessage.id, data);
      data.timer.unref?.();

      return message.reply(`✅ Giveaway created: ${giveawayMessage.url}`);
    }

    // REROLL: $reroll MESSAGE_ID
    if (command === "reroll") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("❌ You need Manage Server permission.");
      }

      const id = args[0];
      if (!/^\d{17,20}$/.test(id || "")) {
        return message.reply("Usage: `$reroll MESSAGE_ID`");
      }

      return await finishGiveaway(message.channel, id, true)
        .catch(err => message.reply(`❌ ${err.message}`));
    }

    // TICKET PANEL: $ticketpanel
    if (command === "ticketpanel") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply("❌ You need Manage Channels permission.");
      }

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("🎫 Support Tickets")
        .setDescription("Click below to create your private support ticket.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Create Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    // MUTE/TIMEOUT: $mute @user 10m reason
    if (command === "mute") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("❌ You need Moderate Members permission.");
      }

      const member = message.mentions.members.first();
      const duration = durationMs(args[1]);
      const reason = args.slice(2).join(" ") || "No reason provided";

      if (!member || !duration || duration > 28 * 86400000) {
        return message.reply("Usage: `$mute @user 10m reason` (10s–20d)");
      }

      if (member.id === message.author.id || member.user.bot ||
          !member.moderatable) {
        return message.reply("❌ I can't timeout that member.");
      }

      await member.timeout(duration, reason);
      return message.reply(`🔇 Timed out ${member.user.tag}. Reason: ${reason}`);
    }

    // BAN: $ban @user reason
    if (command === "ban") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply("❌ You need Ban Members permission.");
      }

      const member = message.mentions.members.first();
      const reason = args.slice(1).join(" ") || "No reason provided";

      if (!member) return message.reply("Usage: `$ban @user reason`");
      if (member.id === message.author.id || member.user.bot || !member.bannable) {
        return message.reply("❌ I can't ban that member.");
      }

      await member.ban({ reason });
      return message.reply(`🔨 Banned ${member.user.tag}. Reason: ${reason}`);
    }

    // KICK: $kick @user reason
    if (command === "kick") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply("❌ You need Kick Members permission.");
      }

      const member = message.mentions.members.first();
      const reason = args.slice(1).join(" ") || "No reason provided";

      if (!member) return message.reply("Usage: `$kick @user reason`");
      if (member.id === message.author.id || member.user.bot || !member.kickable) {
        return message.reply("❌ I can't kick that member.");
      }

      await member.kick(reason);
      return message.reply(`👢 Kicked ${member.user.tag}. Reason: ${reason}`);
    }
  } catch (error) {
    console.error(`Command ${command} error:`, error);
    return message.reply("❌ Command failed. Check Railway logs and bot permissions.")
      .catch(() => {});
  }
});

// TICKET BUTTON HANDLER
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton() ||
      interaction.customId !== "create_ticket") return;

  try {
    const guild = interaction.guild;
    if (!guild) {
      return interaction.reply({
        content: "Use this button inside a server.",
        ephemeral: true
      });
    }

    const existing = guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );

    if (existing) {
      return interaction.reply({
        content: `You already have a ticket: ${existing}`,
        ephemeral: true
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels
          ]
        }
      ]
    });

    await channel.send(`Welcome ${interaction.user}! Please describe your issue.`);
    return interaction.reply({
      content: `✅ Ticket created: ${channel}`,
      ephemeral: true
    });
  } catch (error) {
    console.error("Ticket error:", error);
    const reply = {
      content: "❌ Couldn't create ticket. Check bot permissions.",
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("Login failed. Check Railway DISCORD_TOKEN:", err);
});
