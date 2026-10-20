
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  PermissionsBitField, ChannelType, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, Events
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const PREFIX = "$";

if (!TOKEN) {
  console.error("Missing TOKEN environment variable!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const giveaways = new Map();
const warnings = new Map();
const tickets = new Set();
const color = 0x8b5cf6;

const embed = (title, description) =>
  new EmbedBuilder().setColor(color).setTitle(title)
    .setDescription(description).setTimestamp();

function duration(text) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(text || "");
  if (!match) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ms = Number(match[1]) * units[match[2].toLowerCase()];
  return ms >= 1000 && ms <= 30 * 86400000 ? ms : null;
}

client.once(Events.ClientReady, c =>
  console.log(`Bot online as ${c.user.tag}`)
);

client.on(Events.MessageCreate, async message => {
  try {
    if (!message.guild || message.author.bot) return;
    const content = message.content.trim();
    if (!content.startsWith(PREFIX)) return;

    const parts = content.slice(1).trim().split(/\s+/);
    const cmd = (parts.shift() || "").toLowerCase();
    const args = parts;
    const member = message.mentions.members.first();

    if (cmd === "ping")
      return message.reply(`🏓 Pong! ${client.ws.ping}ms`);

    if (cmd === "help")
      return message.channel.send({ embeds: [embed("📚 Commands",
        "**General**\n`$ping` `$help` `$serverinfo` `$userinfo` `$membercount` `$avatar` `$8ball` `$poll`\n\n" +
        "**Moderation**\n`$ban` `$kick` `$mute` `$warn` `$warnings` `$purge` `$lock` `$unlock` `$slowmode`\n\n" +
        "**Giveaways**\n`$gstart` `$gend` `$greroll`\n\n" +
        "**Tickets & Verification**\n`$ticketpanel` `$close` `$verifysetup`")] });

    if (cmd === "serverinfo") {
      const g = message.guild;
      return message.channel.send({ embeds: [
        embed(`📊 ${g.name}`,
          `**Members:** ${g.memberCount}\n**Channels:** ${g.channels.cache.size}\n**Roles:** ${g.roles.cache.size}\n**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:D>`)
          .setThumbnail(g.iconURL())
      ] });
    }

    if (cmd === "userinfo") {
      const user = message.mentions.users.first() || message.author;
      const m = await message.guild.members.fetch(user.id).catch(() => null);
      return message.channel.send({ embeds: [
        embed(`👤 ${user.tag}`,
          `**ID:** ${user.id}\n**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:D>\n**Joined:** ${m ? `<t:${Math.floor(m.joinedTimestamp / 1000)}:D>` : "Unknown"}`)
          .setThumbnail(user.displayAvatarURL())
      ] });
    }

    if (cmd === "membercount")
      return message.reply(`👥 Members: **${message.guild.memberCount}**`);

    if (cmd === "avatar") {
      const user = message.mentions.users.first() || message.author;
      return message.channel.send({ embeds: [
        embed(`${user.username}'s Avatar`, "").setImage(user.displayAvatarURL({ size: 1024 }))
      ] });
    }

    if (cmd === "8ball") {
      if (!args.length) return message.reply("Ask a question after `$8ball`.");
      const answers = ["It is certain!", "Probably yes.", "Ask again later.", "Signs point to yes.", "Very doubtful.", "Cannot predict right now."];
      return message.reply(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
    }

    if (cmd === "poll") {
      const bits = args.join(" ").split("|").map(x => x.trim()).filter(Boolean);
      if (bits.length < 3) return message.reply("Use: `$poll Question | Option 1 | Option 2`");
      if (bits.length > 11) return message.reply("Maximum 10 options.");
      const emojis = ["🇦","🇧","🇨","🇩","🇪","🇫","🇬","🇭","🇮","🇯"];
      const p = await message.channel.send({ embeds: [
        embed(`📊 ${bits[0]}`, bits.slice(1).map((x,i) => `${emojis[i]} ${x}`).join("\n"))
      ] });
      for (let i = 1; i < bits.length; i++) await p.react(emojis[i-1]).catch(() => {});
      return;
  }

  
    // MODERATION COMMANDS
    const modPerms = {
      ban: PermissionsBitField.Flags.BanMembers,
      kick: PermissionsBitField.Flags.KickMembers,
      mute: PermissionsBitField.Flags.ModerateMembers,
      warn: PermissionsBitField.Flags.ModerateMembers,
      warnings: PermissionsBitField.Flags.ModerateMembers,
      purge: PermissionsBitField.Flags.ManageMessages,
      lock: PermissionsBitField.Flags.ManageChannels,
      unlock: PermissionsBitField.Flags.ManageChannels,
      slowmode: PermissionsBitField.Flags.ManageChannels
    };

    if (modPerms[cmd]) {
      if (!message.member.permissions.has(modPerms[cmd]))
        return message.reply("❌ You don't have permission to use this command.");

      if (cmd === "ban" || cmd === "kick") {
        if (!member) return message.reply(`Use: \`$${cmd} @user [reason]\``);
        if (member.id === message.author.id)
          return message.reply("You cannot moderate yourself.");
        if (!member.moderatable)
          return message.reply("I can't moderate that member. Check role hierarchy.");
        const reason = args.slice(1).join(" ") || "No reason provided";
        if (cmd === "ban") {
          await member.ban({ reason });
          return message.channel.send(`🔨 Banned ${member.user.tag}. Reason: ${reason}`);
        }
        await member.kick(reason);
        return message.channel.send(`👢 Kicked ${member.user.tag}. Reason: ${reason}`);
      }

      if (cmd === "mute") {
        const time = args.find(x => /^\d+[smhd]$/i.test(x));
        const ms = duration(time);
        if (!member || !ms)
          return message.reply("Use: `$mute @user 10m` (max 30 days).");
        if (!member.moderatable)
          return message.reply("I can't timeout that member. Check role hierarchy.");
        await member.timeout(ms, args.slice(1).join(" ") || "Moderator timeout");
        return message.channel.send(`🔇 Timed out ${member.user.tag} for ${time}.`);
      }

      if (cmd === "warn") {
        if (!member) return message.reply("Use: `$warn @user [reason]`");
        const key = `${message.guild.id}:${member.id}`;
        const list = warnings.get(key) || [];
        const reason = args.slice(1).join(" ") || "No reason given";
        list.push({ reason, moderator: message.author.tag });
        warnings.set(key, list);
        return message.channel.send(`⚠️ Warned ${member.user.tag}: ${reason}`);
      }

      if (cmd === "warnings") {
        if (!member) return message.reply("Use: `$warnings @user`");
        const list = warnings.get(`${message.guild.id}:${member.id}`) || [];
        return message.channel.send({ embeds: [
          embed(`⚠️ Warnings: ${member.user.tag}`,
            list.length ? list.map((w,i) =>
              `**${i+1}.** ${w.reason} — ${w.moderator}`).join("\n")
              : "No warnings recorded this session.")
        ] });
      }

      if (cmd === "purge") {
        const n = Number(args[0]);
        if (!Number.isInteger(n) || n < 1 || n > 100)
          return message.reply("Use: `$purge 1-100`");
        const deleted = await message.channel.bulkDelete(n, true);
        const reply = await message.channel.send(`🧹 Deleted ${deleted.size} messages.`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
        return;
      }

      if (cmd === "lock" || cmd === "unlock") {
        const channel = message.mentions.channels.first() || message.channel;
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: cmd === "unlock" ? null : false
        });
        return message.channel.send(
          cmd === "lock" ? `🔒 Locked ${channel}.` : `🔓 Unlocked ${channel}.`
        );
      }

      if (cmd === "slowmode") {
        const seconds = Number(args[0]);
        if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600)
          return message.reply("Use: `$slowmode 0-21600` seconds.");
        await message.channel.setRateLimitPerUser(seconds);
        return message.channel.send(`⏱️ Slowmode: ${seconds} seconds.`);
      }
                                                  }
      
    // GIVEAWAY COMMANDS
    if (cmd === "gstart") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild))
        return message.reply("❌ You need Manage Server permission.");

      const ms = duration(args[0]);
      const winnersCount = Number(args[1]);
      const prize = args.slice(2).join(" ");

      if (!ms || !Number.isInteger(winnersCount) ||
          winnersCount < 1 || winnersCount > 10 || !prize) {
        return message.reply("Use: `$gstart 1h 1 Nitro`");
      }

      const giveawayEmbed = embed(
        "🎉 GIVEAWAY",
        `**Prize:** ${prize}\n**Hosted by:** ${message.author}\n` +
        `**Winners:** ${winnersCount}\n` +
        `**Ends:** <t:${Math.floor((Date.now()+ms)/1000)}:R>\n\nReact with 🎉 to enter!`
      );

      const giveawayMessage = await message.channel.send({
        embeds: [giveawayEmbed]
      });

      await giveawayMessage.react("🎉");
      giveaways.set(giveawayMessage.id, {
        channelId: message.channel.id,
        prize,
        winnersCount,
        ended: false
      });

      setTimeout(async () => {
        const data = giveaways.get(giveawayMessage.id);
        if (!data || data.ended) return;
        data.ended = true;

        const reaction = giveawayMessage.reactions.cache.get("🎉");
        const users = reaction
          ? await reaction.users.fetch().catch(() => null)
          : null;
        const entrants = users
          ? [...users.values()].filter(u => !u.bot)
          : [];

        const picked = [];
        while (entrants.length && picked.length < data.winnersCount) {
          picked.push(entrants.splice(
            Math.floor(Math.random() * entrants.length), 1
          )[0]);
        }

        await giveawayMessage.reply({
          embeds: [embed(
            "🎉 GIVEAWAY ENDED",
            `**Prize:** ${data.prize}\n` +
            (picked.length
              ? `**Winner(s):** ${picked.join(", ")}`
              : "No valid entries.")
          )]
        }).catch(() => {});
      }, ms);

      return message.reply(`🎉 Giveaway started! ID: \`${giveawayMessage.id}\``);
    }

    if (cmd === "gend") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild))
        return message.reply("❌ You need Manage Server permission.");

      const data = giveaways.get(args[0]);
      if (!data || data.ended)
        return message.reply("Giveaway not found or already ended. Use `$gend MESSAGE_ID`.");

      data.ended = true;
      const channel = await client.channels.fetch(data.channelId).catch(() => null);
      const giveawayMessage = channel
        ? await channel.messages.fetch(args[0]).catch(() => null)
        : null;

      if (!giveawayMessage) return message.reply("I couldn't find that giveaway message.");

      const reaction = giveawayMessage.reactions.cache.get("🎉");
      const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
      const entrants = users ? [...users.values()].filter(u => !u.bot) : [];
      const picked = [];

      while (entrants.length && picked.length < data.winnersCount) {
        picked.push(entrants.splice(
          Math.floor(Math.random() * entrants.length), 1
        )[0]);
      }

      return channel.send(
        picked.length
          ? `🎉 Winner(s) of **${data.prize}**: ${picked.join(", ")}`
          : `No valid entries for **${data.prize}**.`
      );
    }

    if (cmd === "greroll") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild))
        return message.reply("❌ You need Manage Server permission.");

      const data = giveaways.get(args[0]);
      if (!data || !data.ended)
        return message.reply("Use `$greroll MESSAGE_ID` for an ended giveaway from this session.");

      const channel = await client.channels.fetch(data.channelId).catch(() => null);
      const giveawayMessage = channel
        ? await channel.messages.fetch(args[0]).catch(() => null)
        : null;
      if (!giveawayMessage) return message.reply("Giveaway message not found.");

      const reaction = giveawayMessage.reactions.cache.get("🎉");
      const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
      const entrants = users ? [...users.values()].filter(u => !u.bot) : [];
      if (!entrants.length) return message.reply("No eligible entrants.");

      const winner = entrants[Math.floor(Math.random() * entrants.length)];
      return channel.send(`🎉 New winner for **${data.prize}**: ${winner}!`);
    }

    // TICKET PANEL
    if (cmd === "ticketpanel") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ You need Manage Channels permission.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("Create Ticket")
          .setEmoji("🎫")
          .setStyle(ButtonStyle.Primary)
      );

      return message.channel.send({
        embeds: [embed(
          "🎫 Support Tickets",
          "Press **Create Ticket** to open a private support channel."
        )],
        components: [row]
      });
    }

    if (cmd === "close") {
      if (!message.channel.name.startsWith("ticket-"))
        return message.reply("Use this command inside a ticket channel.");

      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ You need Manage Channels permission to close this ticket.");

      await message.reply("🔒 Closing ticket in 3 seconds...");
      setTimeout(() =>
        message.channel.delete("Ticket closed").catch(() => {}),
        3000
      );
      return;
    }

    // VERIFICATION PANEL
    if (cmd === "verifysetup") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
        return message.reply("❌ You need Manage Roles permission.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_member")
          .setLabel("Verify")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success)
      );

      return message.channel.send({
        embeds: [embed(
          "✅ Server Verification",
          "Press **Verify** to receive the `Verified` role.\n" +
          "Create a role named `Verified` first and put the bot's role above it."
        )],
        components: [row]
      });
        }

    
  } catch (error) {
    console.error("Command error:", error);
    await message.reply(
      "⚠️ Command failed. Check my permissions and Railway logs."
    ).catch(() => {});
  }
});

// BUTTON INTERACTIONS: TICKETS + VERIFICATION
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.isButton() || !interaction.guild) return;

    // CREATE PRIVATE TICKET
    if (interaction.customId === "ticket_create") {
      await interaction.deferReply({ ephemeral: true });

      const existing = interaction.guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildText &&
          ch.topic === `Ticket opener ID: ${interaction.user.id}`
      );

      if (existing)
        return interaction.editReply(`You already have a ticket: ${existing}`);

      const safeName = interaction.user.username
        .toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80) || "member";

      const channel = await interaction.guild.channels.create({
        name: `ticket-${safeName}`,
        type: ChannelType.GuildText,
        topic: `Ticket opener ID: ${interaction.user.id}`,
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
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          }
        ]
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close_button")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `${interaction.user} welcome! Please explain your issue.`,
        components: [closeRow]
      });

      return interaction.editReply(`✅ Ticket created: ${channel}`);
    }

    // CLOSE TICKET BUTTON
    if (interaction.customId === "ticket_close_button") {
      const isOpener =
        interaction.channel?.topic ===
        `Ticket opener ID: ${interaction.user.id}`;

      const isModerator =
        interaction.memberPermissions?.has(
          PermissionsBitField.Flags.ManageChannels
        );

      if (!isOpener && !isModerator) {
        return interaction.reply({
          content: "❌ Only the ticket opener or a moderator can close this ticket.",
          ephemeral: true
        });
      }

      await interaction.reply("🔒 Closing ticket in 3 seconds...");
      setTimeout(() => {
        interaction.channel?.delete("Ticket closed").catch(() => {});
      }, 3000);
      return;
    }

    // VERIFICATION BUTTON
    if (interaction.customId === "verify_member") {
      const role = interaction.guild.roles.cache.find(
        r => r.name.toLowerCase() === "verified"
      );

      if (!role) {
        return interaction.reply({
          content: "❌ Create a role named `Verified` first.",
          ephemeral: true
        });
      }

      const botMember = interaction.guild.members.me;

      if (
        !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        role.position >= botMember.roles.highest.position
      ) {
        return interaction.reply({
          content: "❌ Give the bot Manage Roles permission and move its role above Verified.",
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.add(role);

      return interaction.reply({
        content: "✅ You are now verified!",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("Button error:", error);

    if (interaction.isRepliable() &&
        !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "⚠️ Something failed. Check bot permissions and Railway logs.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// START BOT
client.login(TOKEN);

      
