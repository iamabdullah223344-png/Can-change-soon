
const {
  Client, GatewayIntentBits, Partials, PermissionsBitField,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
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
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const PREFIX = "$";
const giveaways = new Map();
const tickets = new Map();

function durationMs(value) {
  const m = /^(\d+)(s|m|h|d)$/i.exec(value || "");
  if (!m) return null;
  const n = Number(m[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = n * unit[m[2].toLowerCase()];
  return Number.isSafeInteger(ms) && ms >= 10000 &&
    ms <= 20 * 86400000 ? ms : null;
}

function has(message, permission) {
  return message.member.permissions.has(permission);
}

function isTicket(channel) {
  return channel && channel.type === ChannelType.GuildText &&
    tickets.has(channel.id);
}

async function finishGiveaway(channel, id, reroll = false) {
  const data = giveaways.get(id);
  if (!data) throw new Error("Giveaway not found in this bot session.");

  const msg = await channel.messages.fetch(id);
  const reaction = msg.reactions.cache.get("🎉");
  const users = reaction ? await reaction.users.fetch() : new Map();
  const pool = [...users.values()].filter(u => !u.bot);
  const winners = [];

  while (pool.length && winners.length < data.count) {
    winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }

  if (!reroll) {
    clearTimeout(data.timer);
    giveaways.delete(id);
  }

  const result = winners.length
    ? winners.map(u => `<@${u.id}>`).join(", ")
    : "No eligible entrants.";

  await channel.send(
    `🎉 **${reroll ? "Giveaway reroll" : "Giveaway ended"}**\n` +
    `Prize: **${data.prize}**\nWinner(s): ${result}`
  );
}

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot ||
      !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = (args.shift() || "").toLowerCase();

  try {
    // PING / PONG
    if (cmd === "ping" || cmd === "pong") {
      return message.reply(`🏓 Pong! WebSocket: ${client.ws.ping}ms`);
    }

    // PREMIUM TICKET PANEL
    if (cmd === "ticketpanel") {
      if (!has(message, PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ You need Manage Channels permission.");

      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setAuthor({
          name: `${message.guild.name} • SUPPORT CENTER`,
          iconURL: message.guild.iconURL() || undefined
        })
        .setTitle("✦ NIGHTBLOOM | TICKET SUPPORT")
        .setDescription(
          "Welcome to our premium support center.\n\n" +
          "Need help with a purchase, partnership, report, or general question?\n\n" +
          "୨୧ **How it works**\n" +
          "・ Press **Open a Ticket** below.\n" +
          "・ Describe your issue clearly.\n" +
          "・ Our team will assist you privately.\n\n" +
          "୨୧ **Before opening**\n" +
          "Please do not spam tickets. Share proof or screenshots when relevant."
        )
        .addFields(
          { name: "🔒 Privacy", value: "Only you and authorized staff can view your ticket.", inline: true },
          { name: "⚡ Support", value: "Our team will respond when available.", inline: true }
        )
        .setFooter({ text: "Nightbloom Support • Keep it respectful" })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_open")
          .setLabel("Open a Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      );

      return message.channel.send({ embeds: [embed], components: [row] });
    }

    // ADD MEMBER TO TICKET
    if (cmd === "add") {
      if (!isTicket(message.channel))
        return message.reply("❌ Use this inside a ticket.");
      if (!has(message, PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ Staff only.");
      const member = message.mentions.members.first();
      if (!member) return message.reply("Usage: `$add @user`");

      await message.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true
      });
      return message.reply(`✅ Added ${member} to this ticket.`);
    }

    // REMOVE MEMBER FROM TICKET
    if (cmd === "remove") {
      if (!isTicket(message.channel))
        return message.reply("❌ Use this inside a ticket.");
      if (!has(message, PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ Staff only.");
      const member = message.mentions.members.first();
      if (!member) return message.reply("Usage: `$remove @user`");

      await message.channel.permissionOverwrites.delete(member.id);
      return message.reply(`✅ Removed ${member} from this ticket.`);
    }

    // CLOSE TICKET
    if (cmd === "close") {
      if (!isTicket(message.channel))
        return message.reply("❌ This isn't a ticket.");
      const owner = tickets.get(message.channel.id);
      const staff = has(message, PermissionsBitField.Flags.ManageChannels);
      if (message.author.id !== owner && !staff)
        return message.reply("❌ Only the ticket owner or staff can close it.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_confirm_close")
          .setLabel("Confirm Close")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("ticket_cancel_close")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      return message.reply({
        content: "Are you sure you want to close this ticket?",
        components: [row]
      });
    }

    // CREATE GIVEAWAY: $giveaway 10m 1 Nitro
    if (cmd === "giveaway") {
      if (!has(message, PermissionsBitField.Flags.ManageGuild))
        return message.reply("❌ Manage Server permission required.");

      const ms = durationMs(args[0]);
      const count = Number(args[1]);
      const prize = args.slice(2).join(" ");
      if (!ms || !Number.isInteger(count) || count < 1 ||
          count > 20 || !prize)
        return message.reply("Usage: `$giveaway 10m 1 Nitro`");

      const end = Date.now() + ms;
      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle("🎉 NIGHTBLOOM GIVEAWAY")
        .setDescription(
          `**Prize:** ${prize}\n**Winners:** ${count}\n` +
          `**Hosted by:** ${message.author}\n\nReact with 🎉 to enter!`
        )
        .addFields({ name: "Ends", value: `<t:${Math.floor(end / 1000)}:R>` });

      const giveaway = await message.channel.send({ embeds: [embed] });
      await giveaway.react("🎉");

      const data = { count, prize, timer: null };
      data.timer = setTimeout(async () => {
        try {
          await finishGiveaway(message.channel, giveaway.id);
        } catch (e) {
          console.error("Giveaway end:", e);
        }
      }, ms);
      data.timer.unref?.();
      giveaways.set(giveaway.id, data);

      return message.reply(`✅ Giveaway created: ${giveaway.url}`);
    }

    // REROLL: $reroll MESSAGE_ID
    if (cmd === "reroll") {
      if (!has(message, PermissionsBitField.Flags.ManageGuild))
        return message.reply("❌ Manage Server permission required.");
      if (!/^\d{17,20}$/.test(args[0] || ""))
        return message.reply("Usage: `$reroll MESSAGE_ID`");
      await finishGiveaway(message.channel, args[0], true);
      return;
    }

    // MUTE: $mute @user 10m reason
    if (cmd === "mute") {
      if (!has(message, PermissionsBitField.Flags.ModerateMembers))
        return message.reply("❌ Moderate Members permission required.");
      const member = message.mentions.members.first();
      const ms = durationMs(args[1]);
      const reason = args.slice(2).join(" ") || "No reason provided";
      if (!member || !ms || ms > 28 * 86400000)
        return message.reply("Usage: `$mute @user 10m reason`");
      if (member.id === message.author.id || member.user.bot ||
          !member.moderatable)
        return message.reply("❌ I can't timeout that member.");
      await member.timeout(ms, reason);
      return message.reply(`🔇 Timed out ${member.user.tag}. Reason: ${reason}`);
    }

    // BAN
    if (cmd === "ban") {
      if (!has(message, PermissionsBitField.Flags.BanMembers))
        return message.reply("❌ Ban Members permission required.");
      const member = message.mentions.members.first();
      const reason = args.slice(1).join(" ") || "No reason provided";
      if (!member) return message.reply("Usage: `$ban @user reason`");
      if (member.id === message.author.id || member.user.bot || !member.bannable)
        return message.reply("❌ I can't ban that member.");
      await member.ban({ reason });
      return message.reply(`🔨 Banned ${member.user.tag}. Reason: ${reason}`);
    }

    // KICK
    if (cmd === "kick") {
      if (!has(message, PermissionsBitField.Flags.KickMembers))
        return message.reply("❌ Kick Members permission required.");
      const member = message.mentions.members.first();
      const reason = args.slice(1).join(" ") || "No reason provided";
      if (!member) return message.reply("Usage: `$kick @user reason`");
      if (member.id === message.author.id || member.user.bot || !member.kickable)
        return message.reply("❌ I can't kick that member.");
      await member.kick(reason);
      return message.reply(`👢 Kicked ${member.user.tag}. Reason: ${reason}`);
    }

    // PURGE: $purge 10
    if (cmd === "purge") {
      if (!has(message, PermissionsBitField.Flags.ManageMessages))
        return message.reply("❌ Manage Messages permission required.");
      const count = Number(args[0]);
      if (!Number.isInteger(count) || count < 1 || count > 100)
        return message.reply("Usage: `$purge 10` (1–100)");
      const deleted = await message.channel.bulkDelete(count, true);
      const notice = await message.channel.send(`🧹 Deleted ${deleted.size} messages.`);
      setTimeout(() => notice.delete().catch(() => {}), 4000);
    }
  } catch (error) {
    console.error(`Command ${cmd} error:`, error);
    await message.reply("❌ Command failed. Check bot permissions and Railway logs.")
      .catch(() => {});
  }
});

// TICKET BUTTONS
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  try {
    if (interaction.customId === "ticket_open") {
      const guild = interaction.guild;
      if (!guild) return interaction.reply({ content: "Server only.", ephemeral: true });

      const existing = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildText &&
        tickets.get(c.id) === interaction.user.id
      );

      if (existing) {
        return interaction.reply({
          content: `You already have a ticket: ${existing}`,
          ephemeral: true
        });
      }

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`
          .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 85),
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles
            ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      });

      tickets.set(channel.id, interaction.user.id);

      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle("🎫 Your Support Ticket")
        .setDescription(
          `Welcome ${interaction.user}!\n\n` +
          "Please describe your issue with as much detail as possible.\n" +
          "A staff member will help you when available."
        )
        .setFooter({ text: "Nightbloom Support • Keep this ticket respectful" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close_button")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [row]
      });

      return interaction.reply({
        content: `✨ Your private ticket is ready: ${channel}`,
        ephemeral: true
      });
    }

    if (interaction.customId === "ticket_close_button") {
      if (!isTicket(interaction.channel))
        return interaction.reply({ content: "Ticket not found.", ephemeral: true });

      const owner = tickets.get(interaction.channel.id);
      const staff = interaction.memberPermissions?.has(
        PermissionsBitField.Flags.ManageChannels
      );

      if (interaction.user.id !== owner && !staff)
        return interaction.reply({
          content: "Only the ticket owner or staff can close it.",
          ephemeral: true
        });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_confirm_close")
          .setLabel("Confirm Close")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("ticket_cancel_close")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: "Are you sure you want to close this ticket?",
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === "ticket_confirm_close") {
      const channel = interaction.channel;
      if (!isTicket(channel))
        return interaction.reply({ content: "Ticket already closed.", ephemeral: true });

      await interaction.reply({
        content: "🔒 Ticket closed. This channel will be deleted in 5 seconds.",
        ephemeral: true
      });

      tickets.delete(channel.id);
      setTimeout(() => channel.delete("Ticket closed").catch(console.error), 5000);
      return;
    }

    if (interaction.customId === "ticket_cancel_close") {
      return interaction.update({
        content: "Ticket closure cancelled.",
        components: []
      });
    }
  } catch (error) {
    console.error("Ticket interaction error:", error);
    const response = {
      content: "❌ Ticket action failed. Check bot permissions.",
      ephemeral: true
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
  }
});

client.once("ready", () => {
  console.log(`✅ GG.Gamerz bot online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("Bot login failed. Check Railway DISCORD_TOKEN:", error);
});
