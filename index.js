
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

const PREFIX = "$";

// Configure these in Railway Variables.
const VERIFY_ROLE_ID = process.env.VERIFY_ROLE_ID || "";
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID || "";

const giveaways = new Map();
const timers = new Map();
const warnings = new Map();
const activeTickets = new Set();

client.once("ready", () => {
  console.log(`✅ Online as ${client.user.tag}`);
});

// ---------- HELPERS ----------

function isStaff(message) {
  return message.member.permissions.has(
    PermissionsBitField.Flags.ManageMessages
  );
}

function parseDuration(input) {
  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  }[unit];

  const ms = n * multiplier;
  return ms > 0 && ms <= 30 * 86400000 ? ms : null;
}

async function safeReply(message, content) {
  try {
    await message.reply(content);
  } catch (error) {
    console.error("Reply failed:", error.message);
  }
}

// ---------- PREFIX COMMAND HANDLER ----------

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();

  try {

    // ---------- 1. PING / PONG ----------

    if (command === "ping") {
      return safeReply(
        message,
        `🏓 Pong! API latency: ${client.ws.ping}ms`
      );
    }

    if (command === "pong") {
      return safeReply(message, "🏓 Ping received!");
    }

    // ---------- 2. GIVEAWAY ----------

    if (command === "giveaway") {
      if (!isStaff(message)) {
        return safeReply(message, "❌ You need Manage Messages.");
      }

      const duration = parseDuration(args[0] || "");
      const winners = Number(args[1]);
      const prize = args.slice(2).join(" ");

      if (!duration || !Number.isInteger(winners) ||
          winners < 1 || winners > 20 || !prize) {
        return safeReply(
          message,
          "Usage: `$giveaway 10m 1 Nitro Prize`"
        );
      }

      const endAt = Date.now() + duration;

      const embed = new EmbedBuilder()
        .setColor(0xB00020)
        .setTitle("🎉 GIVEAWAY")
        .setDescription(
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winners}\n` +
          `**Ends:** <t:${Math.floor(endAt / 1000)}:R>\n\n` +
          "React with 🎉 to enter!"
        )
        .setFooter({ text: "Good luck!" });

      const giveawayMessage = await message.channel.send({
        embeds: [embed]
      });

      await giveawayMessage.react("🎉");

      giveaways.set(giveawayMessage.id, {
        channelId: message.channel.id,
        guildId: message.guild.id,
        prize,
        winners,
        endAt,
        ended: false
      });

      setTimeout(async () => {
        const giveaway = giveaways.get(giveawayMessage.id);
        if (!giveaway || giveaway.ended) return;

        try {
          const fetched = await message.channel.messages.fetch(
            giveawayMessage.id
          );
          const reaction = fetched.reactions.cache.get("🎉");

          const users = reaction
            ? await reaction.users.fetch()
            : null;

          const entrants = users
            ? users.filter(u => !u.bot).map(u => u.id)
            : [];

          giveaway.ended = true;

          const picked = entrants
            .sort(() => Math.random() - 0.5)
            .slice(0, giveaway.winners);

          await message.channel.send(
            picked.length
              ? `🎉 Giveaway ended! Winner(s): ${picked.map(id => `<@${id}>`).join(", ")}\nPrize: **${giveaway.prize}**`
              : `Giveaway ended: **${giveaway.prize}**. No valid entries.`
          );
        } catch (error) {
          console.error("Giveaway end failed:", error.message);
        }
      }, duration);

      return;
    }

    if (command === "end" || command === "reroll") {
      if (!isStaff(message)) {
        return safeReply(message, "❌ Staff only.");
      }

      const id = args[0];
      const giveaway = giveaways.get(id);

      if (!giveaway) {
        return safeReply(
          message,
          "Giveaway not found. Usage: `$end MESSAGE_ID` or `$reroll MESSAGE_ID`"
        );
      }

      if (command === "end") {
        giveaway.ended = true;
        return safeReply(message, `🛑 Ended giveaway for **${giveaway.prize}**.`);
      }

      try {
        const channel = await client.channels.fetch(giveaway.channelId);
        const giveawayMessage = await channel.messages.fetch(id);
        const reaction = giveawayMessage.reactions.cache.get("🎉");
        const users = reaction ? await reaction.users.fetch() : null;
        const entrants = users
          ? users.filter(u => !u.bot).map(u => u.id)
          : [];

        if (!entrants.length) {
          return safeReply(message, "No valid giveaway entrants found.");
        }

        const winner = entrants[
          Math.floor(Math.random() * entrants.length)
        ];

        return safeReply(
          message,
          `🎉 New winner: <@${winner}> — **${giveaway.prize}**`
        );
      } catch {
        return safeReply(message, "Could not fetch that giveaway.");
      }
    }

    // ---------- 3. TICKET PANEL ----------

    if (command === "ticketpanel") {
      if (!isStaff(message)) {
        return safeReply(message, "❌ Staff only.");
      }

      const embed = new EmbedBuilder()
        .setColor(0xB00020)
        .setTitle("🎫 Support Center")
        .setDescription(
          "Need help? Open a private ticket below.\n" +
          "Our staff will assist you as soon as possible."
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_open")
          .setLabel("Open Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Danger)
      );

      await message.channel.send({
        embeds: [embed],
        components: [row]
      });

      return;
    }

    if (command === "close") {
      if (!message.channel.name.startsWith("ticket-")) {
        return safeReply(message, "This isn't a ticket channel.");
      }

      if (!isStaff(message) &&
          !message.channel.permissionsFor(message.author)
            .has(PermissionsBitField.Flags.ViewChannel)) {
        return safeReply(message, "You cannot close this ticket.");
      }

      await safeReply(message, "🔒 Closing ticket...");
      setTimeout(() => message.channel.delete().catch(() => {}), 2000);
      return;
    }

    // ---------- 4. VERIFICATION PANEL ----------

    if (command === "verifysetup") {
      if (!isStaff(message)) {
        return safeReply(message, "❌ Staff only.");
      }

      if (!VERIFY_ROLE_ID) {
        return safeReply(
          message,
          "Set VERIFY_ROLE_ID in Railway Variables first."
        );
      }

      const embed = new EmbedBuilder()
        .setColor(0xB00020)
        .setTitle("🛡️ Server Verification")
        .setDescription("Click the button below to receive your verified role.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_member")
          .setLabel("Verify Me")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success)
      );

      await message.channel.send({
        embeds: [embed],
        components: [row]
      });

      return;
    }

    // ---------- 5. MODERATION ----------

    if (["ban", "kick", "mute", "unmute", "warn"].includes(command)) {
      if (!isStaff(message)) {
        return safeReply(message, "❌ You need Manage Messages.");
      }

      const member = message.mentions.members.first();
      if (!member) {
        return safeReply(message, `Usage: \`$${command} @member [reason]\``);
      }

      if (member.id === message.author.id ||
          member.id === client.user.id) {
        return safeReply(message, "❌ You cannot target yourself or the bot.");
      }

      const reason = args.slice(1).join(" ") || "No reason provided";

      if (command === "warn") {
        const key = `${message.guild.id}:${member.id}`;
        const list = warnings.get(key) || [];
        list.push(reason);
        warnings.set(key, list);

        return safeReply(
          message,
          `⚠️ ${member.user.tag} warned. Total this session: ${list.length}\nReason: ${reason}`
        );
      }

      if (!member.manageable && command !== "ban") {
        return safeReply(message, "❌ My role is too low to manage that member.");
      }

      if (command === "ban") {
        if (!member.bannable) {
          return safeReply(message, "❌ I cannot ban that member.");
        }
        await member.ban({ reason });
        return safeReply(message, `🔨 Banned ${member.user.tag}. Reason: ${reason}`);
      }

      if (command === "kick") {
        if (!member.kickable) {
          return safeReply(message, "❌ I cannot kick that member.");
        }
        await member.kick(reason);
        return safeReply(message, `👢 Kicked ${member.user.tag}.`);
      }

      if (command === "mute") {
        const duration = parseDuration(args[1] || "10m");
        if (!duration || duration > 28 * 86400000) {
          return safeReply(message, "Usage: `$mute @member 10m reason`");
        }

        await member.timeout(duration, reason);
        return safeReply(message, `🔇 Timed out ${member.user.tag}.`);
      }

      if (command === "unmute") {
        await member.timeout(null, reason);
        return safeReply(message, `🔊 Removed timeout from ${member.user.tag}.`);
      }
    }

    // ---------- 6. CHANNEL LOCK / UNLOCK ----------

    if (command === "lock" || command === "unlock") {
      if (!message.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )) {
        return safeReply(message, "❌ You need Manage Channels.");
      }

      const everyone = message.guild.roles.everyone;
      await message.channel.permissionOverwrites.edit(everyone, {
        SendMessages: command === "unlock" ? null : false
      });

      return safeReply(
        message,
        command === "lock" ? "🔒 Channel locked." : "🔓 Channel unlocked."
      );
    }

    // ---------- 7. MEMBER COUNT ----------

    if (command === "members") {
      await message.guild.members.fetch({ withPresences: true }).catch(() => {});
      const total = message.guild.memberCount;
      const online = message.guild.members.cache.filter(
        m => m.presence && m.presence.status !== "offline"
      ).size;

      return safeReply(
        message,
        `👥 **${message.guild.name}**\nTotal members: **${total}**\nOnline: **${online}**`
      );
    }

    // ---------- 8. TIMER START / STOP ----------

    if (command === "timer") {
      const action = (args[0] || "").toLowerCase();
      const key = `${message.guild.id}:${message.channel.id}`;

      if (action === "stop") {
        const existing = timers.get(key);
        if (existing) clearTimeout(existing);
        timers.delete(key);
        return safeReply(message, "⏹️ Timer stopped.");
      }

      if (action !== "start") {
        return safeReply(message, "Usage: `$timer start 60s` or `$timer stop`");
      }

      const duration = parseDuration(args[1] || "");
      if (!duration) {
        return safeReply(message, "Use a duration like `60s`, `5m`, or `1h`.");
      }

      if (timers.has(key)) clearTimeout(timers.get(key));

      await safeReply(
        message,
        `⏱️ Timer started for **${args[1]}**!`
      );

      const timer = setTimeout(async () => {
        timers.delete(key);
        await message.channel.send(`⏰ <@${message.author.id}> Your timer is up!`)
          .catch(() => {});
      }, duration);

      timers.set(key, timer);
      return;
    }

    // ---------- 9. FUN / OW0-STYLE MINI GAMES ----------

    if (command === "coinflip") {
      return safeReply(
        message,
        `🪙 ${Math.random() < 0.5 ? "Heads" : "Tails"}!`
      );
    }

    if (command === "dice") {
      return safeReply(
        message,
        `🎲 You rolled **${Math.floor(Math.random() * 6) + 1}**!`
      );
    }

    if (command === "slots") {
      const symbols = ["🍒", "🍋", "💎", "⭐", "🍀"];
      const roll = () => symbols[Math.floor(Math.random() * symbols.length)];
      const a = roll(), b = roll(), c = roll();

      return safeReply(
        message,
        `🎰 **[ ${a} | ${b} | ${c} ]**\n` +
        (a === b && b === c ? "🎉 Jackpot!" : "Try again!")
      );
    }

    if (command === "hunt") {
      const creatures = ["🐺 Wolf", "🦊 Fox", "🐉 Dragon", "🐱 Cat"];
      return safeReply(
        message,
        `🏹 You found **${creatures[Math.floor(Math.random() * creatures.length)]}**!`
      );
    }

    if (command === "battle") {
      const power = Math.floor(Math.random() * 100) + 1;
      return safeReply(
        message,
        `⚔️ Your battle power is **${power}**! ${
          power >= 70 ? "Victory!" : "Train and try again!"
        }`
      );
    }

    // ---------- 10. SPECIAL PURGE ----------

    if (command === "purge") {
      if (!message.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )) {
        return safeReply(message, "❌ You need Manage Messages.");
      }

      const amount = Number(args[0]);

      if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
        return safeReply(message, "Usage: `$purge 50` (1–100 messages)");
      }

      if (!message.channel.bulkDelete) {
        return safeReply(message, "❌ This channel doesn't support bulk delete.");
      }

      const deleted = await message.channel.bulkDelete(amount, true);

      const notice = await message.channel.send(
        `🧹 Purged **${deleted.size}** recent messages.`
      );

      setTimeout(() => notice.delete().catch(() => {}), 4000);
      return;
    }

  } catch (error) {
    console.error(`Command ${command} failed:`, error);
    await safeReply(message, "❌ Command failed. Check the Railway logs.");
  }
});

// ---------- BUTTON HANDLER: TICKETS + VERIFICATION ----------

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() || !interaction.guild) return;

  try {
    if (interaction.customId === "verify_member") {
      if (!VERIFY_ROLE_ID) {
        return interaction.reply({
          content: "Verification role is not configured.",
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(
        interaction.user.id
      );

      const role = await interaction.guild.roles.fetch(VERIFY_ROLE_ID);

      if (!role || !role.editable) {
        return interaction.reply({
          content: "Verification role is missing or above my bot role.",
          ephemeral: true
        });
      }

      await member.roles.add(role);
      return interaction.reply({
        content: "✅ You are now verified!",
        ephemeral: true
      });
    }

    if (interaction.customId === "ticket_open") {
      const key = `${interaction.guild.id}:${interaction.user.id}`;

      if (activeTickets.has(key)) {
        return interaction.reply({
          content: "You already have a ticket open.",
          ephemeral: true
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`
          .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80),
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID || undefined,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
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

      activeTickets.add(key);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `Welcome <@${interaction.user.id}>! Describe your issue here.`,
        components: [row]
      });

      return interaction.reply({
        content: `🎫 Ticket created: ${channel}`,
        ephemeral: true
      });
    }

    if (interaction.customId === "ticket_close") {
      if (!interaction.channel.name.startsWith("ticket-")) {
        return interaction.reply({
          content: "This is not a ticket.",
          ephemeral: true
        });
      }

      const allowed = interaction.channel.permissionsFor(
        interaction.user.id
      )?.has(PermissionsBitField.Flags.ViewChannel);

      const staff = interaction.memberPermissions?.has(
        PermissionsBitField.Flags.ManageChannels
      );

      if (!allowed && !staff) {
        return interaction.reply({
          content: "You cannot close this ticket.",
          ephemeral: true
        });
      }

      await interaction.reply("🔒 Closing ticket...");
      setTimeout(
        () => interaction.channel.delete().catch(() => {}),
        2000
      );
    }
  } catch (error) {
    console.error("Button failed:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Something went wrong. Check bot permissions and logs.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ---------- SAFE LOGIN ----------

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN in Railway Variables.");
} else {
  client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error("Discord login failed:", error.message);
  });
}
