
const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = function registerPremiumCommands(client) {
  const PREFIX = "$";
  const GOLD = 0xD4AF37;
  const giveaways = new Map();
  const tickets = new Set();

  const embed = (title, description) =>
    new EmbedBuilder()
      .setColor(GOLD)
      .setTitle(`👑 ${title}`)
      .setDescription(description)
      .setTimestamp();

  function hasPermission(member, permission) {
    return member.permissions.has(permission);
  }

  // =========================
  // PREFIX COMMANDS
  // =========================
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = (args.shift() || "").toLowerCase();

    const admin = PermissionsBitField.Flags.Administrator;
    const mod = PermissionsBitField.Flags.ModerateMembers;

    try {
      switch (cmd) {
        case "help": {
          const e = embed("LUXURY COMMANDS", [
            "**GENERAL**",
            "`$ping` · `$serverinfo` · `$userinfo`",
            "`$membercount` · `$avatar` · `$8ball` · `$poll`",
            "",
            "**MODERATION**",
            "`$ban @user [reason]` · `$kick @user [reason]`",
            "`$mute @user 10m` · `$warn @user [reason]`",
            "`$purge 10` · `$lock` · `$unlock`",
            "`$slowmode 5`",
            "",
            "**GIVEAWAYS**",
            "`$gstart 10m 1 Prize name`",
            "`$gend ID` · `$greroll ID`",
            "",
            "**TICKETS & VERIFICATION**",
            "`$ticketpanel` · `$close` · `$verifysetup`"
          ].join("\n"));
          return message.reply({ embeds: [e] });
        }

        case "ping":
          return message.reply(`🏓 Pong! ${client.ws.ping}ms`);

        case "serverinfo": {
          const g = message.guild;
          return message.reply({
            embeds: [embed("SERVER INFORMATION",
              `**Name:** ${g.name}\n` +
              `**Members:** ${g.memberCount}\n` +
              `**Owner ID:** ${g.ownerId}\n` +
              `**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:D>`
            )]
          });
        }

        case "membercount":
          return message.reply(
            `👑 **${message.guild.name}** has **${message.guild.memberCount}** members.`
          );

        case "userinfo": {
          const user = message.mentions.users.first() || message.author;
          const member = await message.guild.members.fetch(user.id).catch(() => null);
          return message.reply({
            embeds: [embed("USER PROFILE",
              `**User:** ${user.tag}\n` +
              `**ID:** ${user.id}\n` +
              `**Joined:** ${member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Unknown"}\n` +
              `**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:D>`
            ).setThumbnail(user.displayAvatarURL())]
          });
        }

        case "avatar": {
          const user = message.mentions.users.first() || message.author;
          return message.reply(user.displayAvatarURL({ size: 1024 }));
        }

        case "8ball": {
          if (!args.length) return message.reply("Ask a question! Example: `$8ball Will I win?`");
          const answers = [
            "Absolutely! 👑", "The signs look good ✨",
            "Maybe. Try again later.", "Not looking likely.",
            "Only time will tell."
          ];
          return message.reply(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
        }

        case "poll": {
          if (!args.length) return message.reply("Usage: `$poll Should we host an event?`");
          const poll = await message.channel.send({
            embeds: [embed("COMMUNITY POLL", args.join(" "))]
          });
          await poll.react("👍");
          await poll.react("👎");
          return;
        }

        // =========================
        // MODERATION
        // =========================

        case "ban":
        case "kick": {
          if (!hasPermission(message.member, admin))
            return message.reply("❌ Administrator permission required.");

          const user = message.mentions.members.first();
          if (!user) return message.reply(`Usage: \`$${cmd} @user reason\``);
          if (user.id === message.author.id || user.id === client.user.id)
            return message.reply("❌ You cannot target yourself or the bot.");

          const reason = args.slice(1).join(" ") || "No reason provided";
          if (!user.moderatable && cmd === "kick")
            return message.reply("❌ I cannot kick that member. Check role hierarchy.");

          if (cmd === "ban") {
            if (!user.bannable)
              return message.reply("❌ I cannot ban that member. Check my permissions and role hierarchy.");
            await user.ban({ reason });
          } else {
            await user.kick(reason);
          }

          return message.reply({
            embeds: [embed("MODERATION ACTION",
              `**Action:** ${cmd}\n**Member:** ${user.user.tag}\n**Reason:** ${reason}`)]
          });
        }

        case "mute": {
          if (!hasPermission(message.member, mod))
            return message.reply("❌ You need the Moderate Members permission.");

          const user = message.mentions.members.first();
          const duration = args[1] || "10m";
          const match = duration.match(/^(\d+)(m|h|d)$/i);
          if (!user || !match)
            return message.reply("Usage: `$mute @user 10m` (or 1h, 1d)");

          const amount = Number(match[1]);
          const unit = match[2].toLowerCase();
          const ms = amount * (unit === "m" ? 60000 : unit === "h" ? 3600000 : 86400000);

          if (amount < 1 || ms > 2419200000)
            return message.reply("❌ Duration must be between 1 minute and 28 days.");
          if (!user.moderatable)
            return message.reply("❌ I cannot timeout that member.");

          await user.timeout(ms, `By ${message.author.tag}`);
          return message.reply(`🔇 Timed out **${user.user.tag}** for **${duration}**.`);
        }

        case "warn": {
          if (!hasPermission(message.member, mod))
            return message.reply("❌ You need the Moderate Members permission.");
          const user = message.mentions.members.first();
          if (!user) return message.reply("Usage: `$warn @user reason`");
          const reason = args.slice(1).join(" ") || "No reason provided";
          return message.reply({
            embeds: [embed("WARNING ISSUED",
              `**Member:** ${user.user.tag}\n**Reason:** ${reason}\n` +
              "Note: this basic version does not save warning history.")]
          });
        }

        case "purge": {
          if (!hasPermission(message.member, PermissionsBitField.Flags.ManageMessages))
            return message.reply("❌ You need Manage Messages permission.");
          const n = Number(args[0]);
          if (!Number.isInteger(n) || n < 1 || n > 100)
            return message.reply("Usage: `$purge 1-100`");
          const deleted = await message.channel.bulkDelete(n, true);
          const notice = await message.channel.send(`🧹 Deleted ${deleted.size} messages.`);
          setTimeout(() => notice.delete().catch(() => {}), 4000);
          return;
        }

        case "lock":
        case "unlock": {
          if (!hasPermission(message.member, PermissionsBitField.Flags.ManageChannels))
            return message.reply("❌ You need Manage Channels permission.");
          const everyone = message.guild.roles.everyone;
          await message.channel.permissionOverwrites.edit(everyone, {
            SendMessages: cmd === "unlock" ? null : false
          });
          return message.reply(`🔐 Channel ${cmd === "lock" ? "locked" : "unlocked"}.`);
        }

        case "slowmode": {
          if (!hasPermission(message.member, PermissionsBitField.Flags.ManageChannels))
            return message.reply("❌ You need Manage Channels permission.");
          const seconds = Number(args[0]);
          if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600)
            return message.reply("Usage: `$slowmode 5` (0–21600 seconds)");
          await message.channel.setRateLimitPerUser(seconds);
          return message.reply(`⏱️ Slowmode set to ${seconds} seconds.`);
        }

        // =========================
        // GIVEAWAYS
        // =========================

        case "gstart": {
          if (!hasPermission(message.member, admin))
            return message.reply("❌ Administrator permission required.");

          const durationMatch = (args[0] || "").match(/^(\d+)(m|h|d)$/i);
          const winners = Number(args[1]);
          const prize = args.slice(2).join(" ");

          if (!durationMatch || !Number.isInteger(winners) ||
              winners < 1 || winners > 10 || !prize)
            return message.reply("Usage: `$gstart 10m 1 Prize name`");

          const amount = Number(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          const duration = amount * (unit === "m" ? 60000 : unit === "h" ? 3600000 : 86400000);
          if (amount < 1 || duration > 604800000)
            return message.reply("❌ Giveaway duration must be up to 7 days.");

          const id = `${Date.now()}`;
          const endAt = Date.now() + duration;
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`lux_join_${id}`)
              .setLabel("Enter Giveaway").setEmoji("🎉")
              .setStyle(ButtonStyle.Success)
          );

          const post = await message.channel.send({
            embeds: [embed("GIVEAWAY",
              `**Prize:** ${prize}\n**Winners:** ${winners}\n` +
              `**Ends:** <t:${Math.floor(endAt / 1000)}:R>\n**Entries:** 0`)],
            components: [row]
          });

          giveaways.set(id, {
            channelId: message.channel.id, messageId: post.id,
            prize, winners, endAt, entries: new Set(), ended: false
          });
          return message.reply(`👑 Giveaway created! ID: \`${id}\``);
        }

        case "gend":
        case "greroll": {
          if (!hasPermission(message.member, admin))
            return message.reply("❌ Administrator permission required.");
          const id = args[0];
          const giveaway = giveaways.get(id);
          if (!giveaway) return message.reply("❌ Giveaway ID not found.");
          if (cmd === "gend" && giveaway.ended)
            return message.reply("This giveaway has already ended.");
          if (cmd === "greroll" && !giveaway.ended)
            return message.reply("End the giveaway before rerolling.");

          if (cmd === "gend") giveaway.ended = true;
          const entrants = [...giveaway.entries];
          const winners = [];
          while (entrants.length && winners.length < giveaway.winners) {
            winners.push(entrants.splice(Math.floor(Math.random() * entrants.length), 1)[0]);
          }

          const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
          const post = channel ? await channel.messages.fetch(giveaway.messageId).catch(() => null) : null;
          if (post && cmd === "gend") {
            await post.edit({ components: [] }).catch(() => {});
            await post.reply(winners.length
              ? `🎉 Congratulations ${winners.map(id => `<@${id}>`).join(", ")}! You won **${giveaway.prize}**!`
              : `No entries for **${giveaway.prize}**.`);
          } else if (channel) {
            await channel.send(winners.length
              ? `🎉 New winner(s): ${winners.map(id => `<@${id}>`).join(", ")} — **${giveaway.prize}**`
              : "No eligible entries to reroll.");
          }
          return message.reply(cmd === "gend" ? "Giveaway ended." : "Reroll complete.");
        }

        // =========================
        // TICKETS
        // =========================

        case "ticketpanel": {
          if (!hasPermission(message.member, admin))
            return message.reply("❌ Administrator permission required.");
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("lux_ticket_open")
              .setLabel("Open a Ticket").setEmoji("🎫")
              .setStyle(ButtonStyle.Primary)
          );
          return message.channel.send({
            embeds: [embed("SUPPORT CENTER",
              "Need help? Click below to open a private support ticket.")],
            components: [row]
          });
        }

        case "close": {
          if (!message.channel.name.startsWith("ticket-"))
            return message.reply("This command can only be used in a ticket channel.");
          if (!hasPermission(message.member, PermissionsBitField.Flags.ManageChannels))
            return message.reply("❌ A staff member with Manage Channels permission must close this ticket.");
          await message.channel.delete("Ticket closed").catch(() => {});
          return;
        }

        // =========================
        // VERIFICATION PANEL
        // =========================

        case "verifysetup": {
          if (!hasPermission(message.member, admin))
            return message.reply("❌ Administrator permission required.");
          if (!process.env.VERIFIED_ROLE_ID)
            return message.reply("Set the VERIFIED_ROLE_ID environment variable first.");

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("lux_verify")
              .setLabel("Verify").setEmoji("✅")
              .setStyle(ButtonStyle.Success)
          );
          return message.channel.send({
            embeds: [embed("MEMBER VERIFICATION",
              "Click **Verify** to receive the verified member role.")],
            components: [row]
          });
        }
      }
    } catch (error) {
      console.error(`Command $${cmd} failed:`, error);
      if (!message.deleted) {
        await message.reply("❌ Something went wrong. Check the bot logs and permissions.")
          .catch(() => {});
      }
    }
  });

  // =========================
  // BUTTON HANDLER
  // =========================

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() || !interaction.guild) return;

    try {
      if (interaction.customId.startsWith("lux_join_")) {
        const id = interaction.customId.slice("lux_join_".length);
        const giveaway = giveaways.get(id);

        if (!giveaway || giveaway.ended || Date.now() >= giveaway.endAt)
          return interaction.reply({ content: "This giveaway has ended.", ephemeral: true });

        if (giveaway.entries.has(interaction.user.id)) {
          giveaway.entries.delete(interaction.user.id);
          return interaction.reply({ content: "Entry removed.", ephemeral: true });
        }

        giveaway.entries.add(interaction.user.id);
        return interaction.reply({ content: "🎉 You're entered! Click again to leave.", ephemeral: true });
      }

      if (interaction.customId === "lux_ticket_open") {
        await interaction.deferReply({ ephemeral: true });

        if (tickets.has(`${interaction.guild.id}:${interaction.user.id}`))
          return interaction.editReply("You already have a ticket open.");

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`.toLowerCase()
            .replace(/[^a-z0-9-]/g, "-").slice(0, 90),
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: interaction.guild.roles.everyone.id, deny: ["ViewChannel"] },
            { id: interaction.user.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
            { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageChannels", "ReadMessageHistory"] }
          ]
        });

        tickets.add(`${interaction.guild.id}:${interaction.user.id}`);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("lux_ticket_close")
            .setLabel("Close Ticket").setEmoji("🔒")
            .setStyle(ButtonStyle.Danger)
        );
        await channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [embed("SUPPORT TICKET", "Explain your issue here. Staff will assist you.")],
          components: [row]
        });
        return interaction.editReply(`Ticket created: ${channel}`);
      }

      if (interaction.customId === "lux_ticket_close") {
        if (!interaction.channel.name.startsWith("ticket-"))
          return interaction.reply({ content: "Not a ticket channel.", ephemeral: true });

        const isOwner = interaction.channel.permissionOverwrites.cache.has(interaction.user.id);
        const isStaff = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels);
        if (!isOwner && !isStaff)
          return interaction.reply({ content: "Only the ticket owner or staff can close this ticket.", ephemeral: true });

        await interaction.reply({ content: "Closing ticket...", ephemeral: true });
        for (const [key] of tickets) {
          if (key.startsWith(`${interaction.guild.id}:`)) {
            const userId = key.split(":")[1];
            if (interaction.channel.permissionOverwrites.cache.has(userId)) tickets.delete(key);
          }
        }
        return interaction.channel.delete("Ticket closed");
      }

      if (interaction.customId === "lux_verify") {
        const role = await interaction.guild.roles.fetch(process.env.VERIFIED_ROLE_ID);
        if (!role) return interaction.reply({ content: "Verified role not found.", ephemeral: true });
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(role);
        return interaction.reply({ content: "✅ You are now verified!", ephemeral: true });
      }
    } catch (error) {
      console.error("Button handler failed:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Action failed. Check bot permissions.", ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: "❌ Action failed. Check bot permissions.", ephemeral: true }).catch(() => {});
      }
    }
  });

  console.log("👑 Black & Gold premium commands loaded.");
};
client.login(process.env.DISCORD_TOKEN);
            
