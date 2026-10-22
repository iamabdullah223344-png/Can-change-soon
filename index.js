const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ===== PART 1: MODERATION COMMANDS ===== */

const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// Temporary warning storage (resets when bot restarts)
if (!client.warnings) client.warnings = new Map();

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith('$')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = (args.shift() || '').toLowerCase();
  const member = message.member;

  const makeEmbed = (title, description) =>
    new EmbedBuilder()
      .setColor(0x252525)
      .setTitle(`🌙 ${title}`)
      .setDescription(description)
      .setFooter({ text: 'Chilling Hangout • Moderation' })
      .setTimestamp();

  const hasPermission = (permission) =>
    member.permissions.has(permission);

  const noPermission = () =>
    message.reply({
      embeds: [
        makeEmbed('Access Denied', '❌ You do not have permission to use this command.')
      ]
    });

  // BAN
  if (command === 'ban') {
    if (!hasPermission(PermissionsBitField.Flags.BanMembers))
      return noPermission();

    const target = message.mentions.members.first();
    if (!target)
      return message.reply('Usage: `$ban @user [reason]`');

    if (!target.bannable)
      return message.reply('❌ I cannot ban that member. Check my role position and permissions.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await target.ban({ reason: `${reason} | By ${message.author.tag}` });
    return message.reply({
      embeds: [makeEmbed('Member Banned', `🔨 **${target.user.tag}** was banned.\n**Reason:** ${reason}`)]
    });
  }

  // KICK
  if (command === 'kick') {
    if (!hasPermission(PermissionsBitField.Flags.KickMembers))
      return noPermission();

    const target = message.mentions.members.first();
    if (!target)
      return message.reply('Usage: `$kick @user [reason]`');

    if (!target.kickable)
      return message.reply('❌ I cannot kick that member. Check my role position and permissions.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await target.kick(`${reason} | By ${message.author.tag}`);
    return message.reply({
      embeds: [makeEmbed('Member Kicked', `👢 **${target.user.tag}** was kicked.\n**Reason:** ${reason}`)]
    });
  }

  // MUTE (timeout)
  if (command === 'mute') {
    if (!hasPermission(PermissionsBitField.Flags.ModerateMembers))
      return noPermission();

    const target = message.mentions.members.first();
    const minutes = Number(args[1]);

    if (!target || !Number.isInteger(minutes) || minutes < 1 || minutes > 40320)
      return message.reply('Usage: `$mute @user minutes` (1–40320)');

    if (!target.moderatable)
      return message.reply('❌ I cannot timeout that member.');

    await target.timeout(minutes * 60000, `By ${message.author.tag}`);
    return message.reply({
      embeds: [makeEmbed('Member Muted', `🔇 **${target.user.tag}** timed out for **${minutes} minutes**.`)]
    });
  }

  // UNMUTE (remove timeout)
  if (command === 'unmute') {
    if (!hasPermission(PermissionsBitField.Flags.ModerateMembers))
      return noPermission();

    const target = message.mentions.members.first();
    if (!target) return message.reply('Usage: `$unmute @user`');
    if (!target.moderatable)
      return message.reply('❌ I cannot remove this member’s timeout.');

    await target.timeout(null, `Timeout removed by ${message.author.tag}`);
    return message.reply({
      embeds: [makeEmbed('Timeout Removed', `🔊 Timeout removed for **${target.user.tag}**.`)]
    });
  }

  // WARN
  if (command === 'warn') {
    if (!hasPermission(PermissionsBitField.Flags.ModerateMembers))
      return noPermission();

    const target = message.mentions.members.first();
    if (!target) return message.reply('Usage: `$warn @user [reason]`');

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const key = `${message.guild.id}:${target.id}`;
    const list = client.warnings.get(key) || [];

    list.push({
      reason,
      moderator: message.author.tag,
      date: new Date().toISOString()
    });

    client.warnings.set(key, list);

    return message.reply({
      embeds: [makeEmbed('Warning Issued', `⚠️ **${target.user.tag}** was warned.\n**Reason:** ${reason}\n**Total warnings this session:** ${list.length}`)]
    });
  }

  // VIEW WARNINGS
  if (command === 'warnings') {
    if (!hasPermission(PermissionsBitField.Flags.ModerateMembers))
      return noPermission();

    const target = message.mentions.members.first();
    if (!target) return message.reply('Usage: `$warnings @user`');

    const list = client.warnings.get(`${message.guild.id}:${target.id}`) || [];
    const description = list.length
      ? list.map((w, i) => `**${i + 1}.** ${w.reason} — *${w.moderator}*`).join('\n')
      : 'No warnings recorded during this session.';

    return message.reply({
      embeds: [makeEmbed(`Warnings: ${target.user.tag}`, description)]
    });
  }

  // PURGE
  if (command === 'purge') {
    if (!hasPermission(PermissionsBitField.Flags.ManageMessages))
      return noPermission();

    const amount = Number(args[0]);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100)
      return message.reply('Usage: `$purge 1-100`');

    const deleted = await message.channel.bulkDelete(amount, true);
    const reply = await message.channel.send({
      embeds: [makeEmbed('Messages Cleared', `🧹 Deleted **${deleted.size}** messages.`)]
    });

    setTimeout(() => reply.delete().catch(() => {}), 5000);
    return;
  }

  // LOCK CHANNEL
  if (command === 'lock') {
    if (!hasPermission(PermissionsBitField.Flags.ManageChannels))
      return noPermission();

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );

    return message.channel.send({
      embeds: [makeEmbed('Channel Locked', '🔒 This channel has been locked by staff.')]
    });
  }

  // UNLOCK CHANNEL
  if (command === 'unlock') {
    if (!hasPermission(PermissionsBitField.Flags.ManageChannels))
      return noPermission();

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: null }
    );

    return message.channel.send({
      embeds: [makeEmbed('Channel Unlocked', '🔓 This channel has been unlocked.')]
    });
  }
});

/* ===== END PART 1 ===== */


/* ===== PART 2: GENERAL COMMANDS ===== */

// Add EmbedBuilder to your existing discord.js imports.
// Do not create another client or another client.login().

if (!client.inviteCounts) client.inviteCounts = new Map();
if (!client.inviteSnapshots) client.inviteSnapshots = new Map();
if (!client.welcomeConfig) client.welcomeConfig = new Map();

// PREFIX: $
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith('$')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = (args.shift() || '').toLowerCase();
  const guild = message.guild;

  const embed = (title, description) =>
    new EmbedBuilder()
      .setColor(0x252525)
      .setTitle(`🌙 ${title}`)
      .setDescription(description)
      .setFooter({ text: 'Chilling Hangout • General' })
      .setTimestamp();

  // PING
  if (command === 'ping') {
    return message.reply({
      embeds: [embed('Pong! 🏓', `Bot latency: **${client.ws.ping}ms**`)]
    });
  }

  // PONG
  if (command === 'pong') {
    return message.reply({
      embeds: [embed('Pong! 🌙', `Hey ${message.author}, chilling in the server!`)]
    });
  }

  // HELP
  if (command === 'help') {
    return message.reply({
      embeds: [
        embed(
          'Command Menu',
          '**🛡️ Moderation**\n`$ban` `$kick` `$mute` `$unmute` `$warn` `$warnings` `$purge` `$lock` `$unlock`\n\n' +
          '**🌙 General**\n`$ping` `$pong` `$serverinfo` `$userinfo` `$membercount` `$avatar` `$accage`\n\n' +
          '**📨 Invites**\n`$i` `$rmi @user`\n\n' +
          '**⚙️ Setup**\n`$welcome #channel message`\n`$leave #channel message`\n\n' +
          'Giveaway, ticket, verification and economy commands will be added in later parts.'
        )
      ]
    });
  }

  // SERVER INFO
  if (command === 'serverinfo') {
    return message.reply({
      embeds: [
        embed(
          guild.name,
          `👥 Members: **${guild.memberCount}**\n` +
          `🆔 Server ID: \`${guild.id}\`\n` +
          `👑 Owner: <@${guild.ownerId}>\n` +
          `📅 Created: <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`
        )
      ]
    });
  }

  // MEMBER COUNT
  if (command === 'membercount') {
    return message.reply({
      embeds: [embed('Server Members', `👥 Total members: **${guild.memberCount}**`)]
    });
  }

  // USER INFO
  if (command === 'userinfo') {
    const user = message.mentions.users.first() || message.author;
    const member = await guild.members.fetch(user.id).catch(() => null);

    return message.reply({
      embeds: [
        embed(
          `User Info: ${user.username}`,
          `👤 User: ${user}\n🆔 ID: \`${user.id}\`\n` +
          `📅 Account created: <t:${Math.floor(user.createdTimestamp / 1000)}:F>\n` +
          `📥 Joined server: ${member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unknown'}`
        ).setThumbnail(user.displayAvatarURL({ size: 256 }))
      ]
    });
  }

  // ACCOUNT AGE
  if (command === 'accage') {
    const user = message.mentions.users.first() || message.author;
    const created = Math.floor(user.createdTimestamp / 1000);
    return message.reply({
      embeds: [
        embed(
          'Account Age 🔎',
          `👤 ${user}\n📅 Created: <t:${created}:F>\n⏳ Age: <t:${created}:R>`
        )
      ]
    });
  }

  // AVATAR
  if (command === 'avatar') {
    const user = message.mentions.users.first() || message.author;
    return message.reply({
      embeds: [
        embed('Avatar', `🖼️ [Open avatar](${user.displayAvatarURL({ size: 1024 })})`)
          .setImage(user.displayAvatarURL({ size: 1024 }))
      ]
    });
  }

  // INVITE COUNT
  if (command === 'i' || command === 'invites') {
    const key = `${guild.id}:${message.author.id}`;
    const count = client.inviteCounts.get(key) || 0;

    return message.reply({
      embeds: [
        embed(
          'Invite Count 📩',
          `${message.author}\nYou've tracked **${count}** invited member(s).\n\n` +
          'Note: invite tracking must be configured to count actual joins.'
        )
      ]
    });
  }

  // RESET INVITES
  if (command === 'rmi') {
    if (!message.member.permissions.has('ManageGuild'))
      return message.reply('❌ You need **Manage Server** permission.');

    const target = message.mentions.users.first();
    if (!target) return message.reply('Usage: `$rmi @user`');

    client.inviteCounts.set(`${guild.id}:${target.id}`, 0);

    return message.reply({
      embeds: [embed('Invites Reset', `♻️ Invite count reset for ${target}.`)]
    });
  }

  // WELCOME MESSAGE SETUP
  if (command === 'welcome') {
    if (!message.member.permissions.has('ManageGuild'))
      return message.reply('❌ You need **Manage Server** permission.');

    const channel = message.mentions.channels.first();
    const text = args.filter(arg => !/^<#\d+>$/.test(arg)).join(' ');

    if (!channel || !text)
      return message.reply('Usage: `$welcome #channel Welcome {user} to {server}!`');

    client.welcomeConfig.set(`${guild.id}:welcome`, {
      channelId: channel.id,
      text
    });

    return message.reply({
      embeds: [embed('Welcome Configured ✅', `Channel: ${channel}\nMessage: ${text}`)]
    });
  }

  // LEAVE MESSAGE SETUP
  if (command === 'leave') {
    if (!message.member.permissions.has('ManageGuild'))
      return message.reply('❌ You need **Manage Server** permission.');

    const channel = message.mentions.channels.first();
    const text = args.filter(arg => !/^<#\d+>$/.test(arg)).join(' ');

    if (!channel || !text)
      return message.reply('Usage: `$leave #channel {user} has left {server}.`');

    client.welcomeConfig.set(`${guild.id}:leave`, {
      channelId: channel.id,
      text
    });

    return message.reply({
      embeds: [embed('Leave Message Configured ✅', `Channel: ${channel}\nMessage: ${text}`)]
    });
  }
});

/* ===== END PART 2A ===== */


/* ===== PART 3A: GIVEAWAY COMMANDS ===== */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Temporary storage. Giveaways reset if the bot restarts.
if (!client.giveaways) client.giveaways = new Map();

function giveawayEmbed(g) {
  return new EmbedBuilder()
    .setColor(0x252525)
    .setTitle('🌙 CHILLING HANGOUT • GIVEAWAY')
    .setDescription(
      `🎁 **Prize:** ${g.prize}\n` +
      `👑 **Host:** <@${g.hostId}>\n` +
      `🏆 **Winners:** ${g.winnerCount}\n` +
      `👥 **Entries:** ${g.entries.size}\n\n` +
      (g.ended
        ? `🔒 **Giveaway Ended**`
        : `⏳ **Ends:** <t:${Math.floor(g.endAt / 1000)}:R>\n\nClick **Enter Giveaway 🎉** to join!`)
    )
    .setFooter({ text: `Giveaway ID: ${g.id}` })
    .setTimestamp();
}

function giveawayRow(g) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter_${g.id}`)
      .setLabel(g.ended ? 'Giveaway Ended' : 'Enter Giveaway 🎉')
      .setStyle(g.ended ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(g.ended)
  );
}

// Put these cases INSIDE your existing messageCreate handler.
// Use the existing variables: message, args, command, client.

if (command === 'giveaway') {
  if (!message.member.permissions.has('ManageGuild'))
    return message.reply('❌ You need Manage Server permission.');

  // Usage: $giveaway 10m 1 Nitro
  const durationText = args[0]?.toLowerCase();
  const winnerCount = Number(args[1]);
  const prize = args.slice(2).join(' ');

  const match = durationText?.match(/^(\d+)(m|h|d)$/);
  if (!match || !Number.isInteger(winnerCount) ||
      winnerCount < 1 || winnerCount > 20 || !prize) {
    return message.reply(
      'Usage: `$giveaway <duration> <winners> <prize>`\nExample: `$giveaway 10m 1 Nitro`\nDuration: m = minutes, h = hours, d = days.'
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;

  if (amount < 1 || amount * multiplier > 30 * 86400000)
    return message.reply('❌ Duration must be between 1 minute and 30 days.');

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const g = {
    id,
    guildId: message.guild.id,
    channelId: message.channel.id,
    hostId: message.author.id,
    prize,
    winnerCount,
    endAt: Date.now() + amount * multiplier,
    entries: new Set(),
    ended: false,
    messageId: null
  };

  const sent = await message.channel.send({
    embeds: [giveawayEmbed(g)],
    components: [giveawayRow(g)]
  });

  g.messageId = sent.id;
  client.giveaways.set(id, g);

  return message.reply(`✅ Giveaway created! ID: \`${id}\``);
}

if (command === 'end') {
  if (!message.member.permissions.has('ManageGuild'))
    return message.reply('❌ You need Manage Server permission.');

  const id = args[0];
  const g = client.giveaways.get(id);

  if (!g || g.guildId !== message.guild.id)
    return message.reply('❌ Giveaway not found. Use its ID.');

  if (g.ended) return message.reply('This giveaway has already ended.');

  await finishGiveaway(client, g);
  return message.reply('🔒 Giveaway ended.');
}

if (command === 'reroll') {
  if (!message.member.permissions.has('ManageGuild'))
    return message.reply('❌ You need Manage Server permission.');

  const id = args[0];
  const g = client.giveaways.get(id);

  if (!g || g.guildId !== message.guild.id)
    return message.reply('❌ Giveaway not found. Use its ID.');

  if (!g.ended) return message.reply('End the giveaway before rerolling.');

  const previousWinners = g.winners || [];
  const candidates = [...g.entries].filter(uid => !previousWinners.includes(uid));

  if (!candidates.length)
    return message.reply('❌ No new eligible entrants to reroll.');

  const winners = candidates.sort(() => Math.random() - 0.5)
    .slice(0, g.winnerCount);

  g.winners = [...previousWinners, ...winners];

  return message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x252525)
        .setTitle('🌙 Giveaway Reroll')
        .setDescription(
          `🎁 **Prize:** ${g.prize}\n🏆 **New winner(s):** ${winners.map(id => `<@${id}>`).join(', ')}`
        )
    ]
  });
}

/* ===== END PART 3A ===== */


/* ===== PART 4: TICKETS & VERIFICATION ===== */

// Uses your EXISTING client. Do not create another client or login.
// Uses a separate command handler; merge if you already have one.

const p4 = require('discord.js');

if (!client.ticketSettings) client.ticketSettings = new Map();
if (!client.verifySettings) client.verifySettings = new Map();
if (!client.openTickets) client.openTickets = new Map();

const p4Embed = (title, description) =>
  new p4.EmbedBuilder()
    .setColor(0x292238)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: '🌙 Chilling Hangout' })
    .setTimestamp();

// ===== TICKET PANEL COMMAND =====
// Usage: $ticketpanel @StaffRole

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith('$')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = (args.shift() || '').toLowerCase();

  try {
    if (command === 'ticketpanel') {
      if (!message.member.permissions.has(
        p4.PermissionsBitField.Flags.ManageGuild
      )) return message.reply('❌ You need Manage Server permission.');

      const staffRole = message.mentions.roles.first();
      if (!staffRole)
        return message.reply('Usage: `$ticketpanel @StaffRole`');

      client.ticketSettings.set(message.guild.id, {
        staffRoleId: staffRole.id
      });

      const menu = new p4.StringSelectMenuBuilder()
        .setCustomId('ch_ticket_category')
        .setPlaceholder('🌙 Choose a support category')
        .addOptions(
          {
            label: 'Giveaways claim 💫',
            value: 'giveaways',
            emoji: '🎁',
            description: 'Claim a giveaway prize'
          },
          {
            label: 'Help & support',
            value: 'support',
            emoji: '🎟️',
            description: 'Get help from our staff'
          },
          {
            label: 'Invite reward',
            value: 'invite',
            emoji: '📩',
            description: 'Ask about invite rewards'
          },
          {
            label: 'Event claim',
            value: 'event',
            emoji: '🏆',
            description: 'Claim an event reward'
          },
          {
            label: 'Report',
            value: 'report',
            emoji: '🚩',
            description: 'Report a problem privately'
          }
        );

      const row = new p4.ActionRowBuilder().addComponents(menu);

      await message.channel.send({
        embeds: [
          p4Embed(
            '{🌙} chilling hangout support',
            'Welcome to **Chilling Hangout Support**.\n\n' +
            '🎟️ Select a category from the menu below to open a private ticket.\n\n' +
            `🛡️ Support team: ${staffRole}\n` +
            '🌙 Please explain your issue clearly.'
          )
        ],
        components: [row]
      });

      return message.reply('✅ Premium ticket panel created!');
    }

    // ===== VERIFICATION PANEL COMMAND =====
    // Usage: $verifypanel @MemberRole @StaffRole

    if (command === 'verifypanel') {
      if (!message.member.permissions.has(
        p4.PermissionsBitField.Flags.ManageGuild
      )) return message.reply('❌ You need Manage Server permission.');

      const roles = [...message.mentions.roles.values()];
      if (roles.length < 2)
        return message.reply(
          'Usage: `$verifypanel @MemberRole @StaffRole`\n' +
          'Mention the role members receive first, then the staff role.'
        );

      const memberRole = roles[0];
      const staffRole = roles[1];

      if (memberRole.id === message.guild.id)
        return message.reply('❌ The everyone role cannot be the verification role.');

      client.verifySettings.set(message.guild.id, {
        memberRoleId: memberRole.id,
        staffRoleId: staffRole.id
      });

      const button = new p4.ButtonBuilder()
        .setCustomId('ch_verify_member')
        .setLabel('Channel Access ✅')
        .setStyle(p4.ButtonStyle.Success)
        .setEmoji('🌙');

      await message.channel.send({
        embeds: [
          p4Embed(
            '{🌙} Chilling Verification',
            'Welcome to **Chilling Hangout**!\n\n' +
            '🔐 Press **Channel Access ✅** below to verify.\n\n' +
            '✨ You will receive the configured member role when successful.'
          )
        ],
        components: [
          new p4.ActionRowBuilder().addComponents(button)
        ]
      });

      return message.reply(
        `✅ Verification panel created!\nMember role: ${memberRole}\nStaff role: ${staffRole}`
      );
    }
  } catch (error) {
    console.error('Part 4 command error:', error);
    return message.reply('❌ Something went wrong. Check the bot logs and permissions.');
  }
});

// ===== TICKET, CLAIM, CLOSE & VERIFY BUTTONS =====

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.inGuild()) return;

    const guild = interaction.guild;

    // ----- VERIFY MEMBER -----
    if (interaction.isButton() &&
        interaction.customId === 'ch_verify_member') {
      const config = client.verifySettings.get(guild.id);

      if (!config)
        return interaction.reply({
          content: '❌ Verification is not configured. Ask an admin to run $verifypanel.',
          ephemeral: true
        });

      const role = guild.roles.cache.get(config.memberRoleId);
      const botMember = guild.members.me;

      if (!role || !botMember ||
          !botMember.permissions.has(p4.PermissionsBitField.Flags.ManageRoles) ||
          botMember.roles.highest.comparePositionTo(role) <= 0) {
        return interaction.reply({
          content: '❌ The bot needs Manage Roles permission and its highest role must be above the member role.',
          ephemeral: true
        });
      }

      const member = await guild.members.fetch(interaction.user.id);

      if (member.roles.cache.has(role.id)) {
        return interaction.reply({
          content: '✅ You already have channel access!',
          ephemeral: true
        });
      }

      await member.roles.add(role, 'Chilling Hangout verification');

      return interaction.reply({
        content: `✅ Verification successful! You received ${role}.`,
        ephemeral: true
      });
    }

    // ----- OPEN TICKET FROM SELECT MENU -----
    if (interaction.isStringSelectMenu() &&
        interaction.customId === 'ch_ticket_category') {
      const config = client.ticketSettings.get(guild.id);

      if (!config)
        return interaction.reply({
          content: '❌ Ticket system is not configured. Ask an admin to run $ticketpanel @StaffRole.',
          ephemeral: true
        });

      const existing = client.openTickets.get(
        `${guild.id}:${interaction.user.id}`
      );

      if (existing && guild.channels.cache.has(existing)) {
        return interaction.reply({
          content: `❌ You already have an open ticket: <#${existing}>`,
          ephemeral: true
        });
      }

      const staffRole = guild.roles.cache.get(config.staffRoleId);
      const botMember = guild.members.me;

      if (!staffRole || !botMember ||
          !botMember.permissions.has(
            p4.PermissionsBitField.Flags.ManageChannels
          )) {
        return interaction.reply({
          content: '❌ The staff role or bot Manage Channels permission is missing.',
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const category = interaction.values[0];
      const names = {
        giveaways: 'giveaways',
        support: 'support',
        invite: 'invite-reward',
        event: 'event-claim',
        report: 'report'
      };

      const channel = await guild.channels.create({
        name: `${names[category]}-${interaction.user.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 90),
        type: p4.ChannelType.GuildText,
        topic: `Ticket owner: ${interaction.user.id} | Category: ${category}`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [p4.PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              p4.PermissionFlagsBits.ViewChannel,
              p4.PermissionFlagsBits.SendMessages,
              p4.PermissionFlagsBits.ReadMessageHistory,
              p4.PermissionFlagsBits.AttachFiles
            ]
          },
          {
            id: staffRole.id,
            allow: [
              p4.PermissionFlagsBits.ViewChannel,
              p4.PermissionFlagsBits.SendMessages,
              p4.PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: botMember.id,
            allow: [
              p4.PermissionFlagsBits.ViewChannel,
              p4.PermissionFlagsBits.SendMessages,
              p4.PermissionFlagsBits.ReadMessageHistory,
              p4.PermissionFlagsBits.ManageChannels,
              p4.PermissionFlagsBits.ManageMessages
            ]
          }
        ]
      });

      client.openTickets.set(`${guild.id}:${interaction.user.id}`, channel.id);

      const controls = new p4.ActionRowBuilder().addComponents(
        new p4.ButtonBuilder()
          .setCustomId('ch_ticket_claim')
          .setLabel('Claim Ticket')
          .setEmoji('💫')
          .setStyle(p4.ButtonStyle.Primary),
        new p4.ButtonBuilder()
          .setCustomId('ch_ticket_close')
          .setLabel('Close Ticket')
          .setEmoji('🔒')
          .setStyle(p4.ButtonStyle.Danger)
      );

      await channel.send({
        content: `${interaction.user} ${staffRole}`,
        allowedMentions: {
          users: [interaction.user.id],
          roles: [staffRole.id]
        },
        embeds: [
          p4Embed(
            '🌙 Chilling Hangout Support',
            `**Category:** ${names[category]}\n` +
            `**Ticket owner:** ${interaction.user}\n` +
            `**Staff team:** ${staffRole}\n\n` +
            'Please describe your request. A staff member will assist you.'
          )
        ],
        components: [controls]
      });

      return interaction.editReply(`✅ Your ticket is ready: ${channel}`);
    }

    // ----- CLAIM OR CLOSE TICKET -----
    if (interaction.isButton() &&
        ['ch_ticket_claim', 'ch_ticket_close'].includes(interaction.customId)) {
      const topic = interaction.channel?.topic || '';
      const ownerMatch = topic.match(/Ticket owner: (\d+)/);

      if (!ownerMatch)
        return interaction.reply({
          content: '❌ This does not appear to be a ticket channel.',
          ephemeral: true
        });

      const config = client.ticketSettings.get(guild.id);
      const isOwner = ownerMatch[1] === interaction.user.id;
      const isStaff = !!config &&
        interaction.member.roles?.includes?.(config.staffRoleId);

      // Interaction member roles can be represented differently by Discord.js.
      const member = await guild.members.fetch(interaction.user.id);
      const staff = !!config && member.roles.cache.has(config.staffRoleId);
      const canManage = member.permissions.has(
        p4.PermissionsBitField.Flags.ManageChannels
      );

      if (interaction.customId === 'ch_ticket_claim') {
        if (!staff && !canManage) {
          return interaction.reply({
            content: '❌ Only the configured staff role can claim tickets.',
            ephemeral: true
          });
        }

        const claimButton = new p4.ButtonBuilder()
          .setCustomId('ch_ticket_claimed')
          .setLabel(`Claimed by ${interaction.user.username}`.slice(0, 80))
          .setStyle(p4.ButtonStyle.Secondary)
          .setDisabled(true);

        await interaction.update({
          components: [
            new p4.ActionRowBuilder().addComponents(
              claimButton,
              new p4.ButtonBuilder()
                .setCustomId('ch_ticket_close')
                .setLabel('Close Ticket')
                .setEmoji('🔒')
                .setStyle(p4.ButtonStyle.Danger)
            )
          ]
        });

        return interaction.channel.send({
          embeds: [
            p4Embed('Ticket Claimed 💫', `Staff member ${interaction.user} is handling this ticket.`)
          ]
        });
      }

      if (!isOwner && !staff && !canManage) {
        return interaction.reply({
          content: '❌ Only the ticket owner or staff can close this ticket.',
          ephemeral: true
        });
      }

      await interaction.reply({
        content: '🔒 Closing ticket in 3 seconds…',
        ephemeral: true
      });

      setTimeout(async () => {
        client.openTickets.delete(`${guild.id}:${ownerMatch[1]}`);
        await interaction.channel?.delete('Ticket closed').catch(console.error);
      }, 3000);
    }
  } catch (error) {
    console.error('Part 4 interaction error:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred. Check bot permissions and logs.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

/* ===== END PART 4 ===== */

/* ===== PART 5A: ECONOMY STORAGE ===== */

if (!client.economy) client.economy = new Map();
if (!client.economyShop) {
  client.economyShop = new Map([
    ['Moon Box', { price: 250, sell: 100 }],
    ['Lucky Charm', { price: 500, sell: 200 }],
    ['Crystal', { price: 1000, sell: 450 }]
  ]);
}
if (!client.minesGames) client.minesGames = new Map();

function getPlayer(guildId, userId) {
  const key = `${guildId}:${userId}`;

  if (!client.economy.has(key)) {
    client.economy.set(key, {
      cash: 100,
      bank: 0,
      inventory: {},
      lastDaily: 0
    });
  }

  return client.economy.get(key);
}

/* ===== END PART 5A ===== */


/* ===== PART 5B: ECONOMY COMMANDS ===== */

const ecoEmbed = (title, description) =>
  new EmbedBuilder()
    .setColor(0x292238)
    .setTitle(`🌙 ${title}`)
    .setDescription(description)
    .setFooter({ text: 'Chilling Hangout • Moon Economy' })
    .setTimestamp();

const player = getPlayer(message.guild.id, message.author.id);
const ecoKey = `${message.guild.id}:${message.author.id}`;

function ecoAmount(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// BALANCE
if (command === 'balance' || command === 'bal') {
  return message.reply({
    embeds: [
      ecoEmbed(
        '🌙 Moon Wallet',
        `👤 ${message.author}\n\n💵 Cash: **${player.cash}** 🌙\n🏦 Bank: **${player.bank}** 🌙\n💰 Total: **${player.cash + player.bank}** 🌙`
      )
    ]
  });
}

// ADD MONEY — administrators only
if (command === 'addmoney') {
  if (!message.member.permissions.has('Administrator'))
    return message.reply('❌ Administrator permission required.');

  const target = message.mentions.users.first();
  const amount = ecoAmount(args[1]);

  if (!target || !amount)
    return message.reply('Usage: `$addmoney @user amount`');

  const recipient = getPlayer(message.guild.id, target.id);
  recipient.cash += amount;

  return message.reply({
    embeds: [
      ecoEmbed('Money Added 💰', `Added **${amount} 🌙** to ${target}.`)
    ]
  });
}

// DAILY REWARD
if (command === 'daily') {
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (now - player.lastDaily < cooldown) {
    const remaining = cooldown - (now - player.lastDaily);
    const hours = Math.ceil(remaining / 3600000);

    return message.reply(`🌙 Your next daily reward is available in about **${hours} hour(s)**.`);
  }

  const reward = 250;
  player.cash += reward;
  player.lastDaily = now;

  return message.reply({
    embeds: [
      ecoEmbed('Daily Reward 🎁', `You received **${reward} 🌙**!\n💵 New balance: **${player.cash} 🌙**`)
    ]
  });
}

// HUNT
if (command === 'hunt') {
  const found = Math.floor(Math.random() * 151) + 50;
  player.cash += found;

  return message.reply({
    embeds: [
      ecoEmbed('Moon Hunt 🌌', `You explored the moonlit forest and found **${found} 🌙**!`)
    ]
  });
}

// BATTLE
if (command === 'battle') {
  const target = message.mentions.users.first();
  if (!target || target.bot || target.id === message.author.id)
    return message.reply('Usage: `$battle @user`');

  const opponent = getPlayer(message.guild.id, target.id);
  const wager = 50;

  if (player.cash < wager || opponent.cash < wager)
    return message.reply(`Both players need at least **${wager} 🌙** to battle.`);

  const winner = Math.random() < 0.5 ? player : opponent;
  const loser = winner === player ? opponent : player;

  winner.cash += wager;
  loser.cash -= wager;

  return message.reply({
    embeds: [
      ecoEmbed(
        'Moon Battle ⚔️',
        `🏆 Winner: **${winner === player ? message.author.username : target.username}**\n💰 Prize transferred: **${wager} 🌙**`
      )
    ]
  });
}

// LEADERBOARD
if (command === 'leaderboard' || command === 'lb') {
  const entries = [...client.economy.entries()]
    .filter(([key]) => key.startsWith(`${message.guild.id}:`))
    .sort((a, b) => (b[1].cash + b[1].bank) - (a[1].cash + a[1].bank))
    .slice(0, 10);

  const description = entries.length
    ? entries.map(([key, data], i) =>
        `**${i + 1}.** <@${key.split(':')[1]}> — **${data.cash + data.bank} 🌙**`
      ).join('\n')
    : 'No economy players yet.';

  return message.reply({
    embeds: [ecoEmbed('Richest Moon Members 🏆', description)]
  });
}

// DROP CASH
if (command === 'drop') {
  const amount = ecoAmount(args[0]);

  if (!amount || amount > 10000)
    return message.reply('Usage: `$drop amount` (maximum 10,000 🌙)');

  if (player.cash < amount)
    return message.reply('❌ Not enough cash.');

  player.cash -= amount;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`moon_drop_${message.id}`)
      .setLabel(`Claim ${amount} 🌙`)
      .setStyle(ButtonStyle.Success)
  );

  const drop = await message.channel.send({
    embeds: [
      ecoEmbed('Moon Cash Drop 💸', `${message.author} dropped **${amount} 🌙**!\nFirst member to claim gets the cash.`)
    ],
    components: [row]
  });

  client.minesGames.set(`drop:${drop.id}`, {
    owner: message.author.id,
    amount,
    guildId: message.guild.id,
    claimed: false
  });

  return;
}

// GIVE CASH
if (command === 'givecash') {
  const target = message.mentions.users.first();
  const amount = ecoAmount(args[1]);

  if (!target || target.bot || target.id === message.author.id || !amount)
    return message.reply('Usage: `$givecash @user amount`');

  if (player.cash < amount)
    return message.reply('❌ Not enough cash.');

  player.cash -= amount;
  getPlayer(message.guild.id, target.id).cash += amount;

  return message.reply(`💸 Sent **${amount} 🌙** to ${target}.`);
}

// SHOP
if (command === 'shop') {
  const items = [...client.economyShop.entries()];

  return message.reply({
    embeds: [
      ecoEmbed(
        'Moon Shop 🛍️',
        items.length
          ? items.map(([name, item]) =>
              `**${name}**\n💰 Buy: ${item.price} 🌙 • Sell: ${item.sell} 🌙`
            ).join('\n\n')
          : 'The shop is empty.'
      )
    ]
  });
}

// ADD SHOP ITEM — administrators only
if (command === 'shopadd') {
  if (!message.member.permissions.has('Administrator'))
    return message.reply('❌ Administrator permission required.');

  const name = args.slice(0, -2).join(' ');
  const price = ecoAmount(args[args.length - 2]);
  const sell = ecoAmount(args[args.length - 1]);

  if (!name || !price || sell === null || sell > price)
    return message.reply('Usage: `$shopadd Item Name buyPrice sellPrice`\nSell price must not exceed buy price.');

  client.economyShop.set(name, { price, sell });

  return message.reply(`✅ Added **${name}** to the shop. Buy: ${price} 🌙 | Sell: ${sell} 🌙`);
}

// BUY
if (command === 'buy') {
  const name = args.join(' ');
  const item = client.economyShop.get(name);

  if (!item) return message.reply('❌ Item not found. Check `$shop`.');
  if (player.cash < item.price) return message.reply('❌ Not enough cash.');

  player.cash -= item.price;
  player.inventory[name] = (player.inventory[name] || 0) + 1;

  return message.reply(`🛍️ You bought **${name}** for **${item.price} 🌙**.`);
}

// SELL
if (command === 'sell') {
  const name = args.join(' ');
  const item = client.economyShop.get(name);

  if (!item) return message.reply('❌ Item not found in the shop.');
  if (!player.inventory[name]) return message.reply('❌ You do not own this item.');

  player.inventory[name] -= 1;
  if (player.inventory[name] === 0) delete player.inventory[name];

  player.cash += item.sell;

  return message.reply(`💰 Sold **${name}** for **${item.sell} 🌙**.`);
}

// INVENTORY
if (command === 'inventory' || command === 'inv') {
  const items = Object.entries(player.inventory);

  return message.reply({
    embeds: [
      ecoEmbed(
        'Your Inventory 🎒',
        items.length
          ? items.map(([name, count]) => `**${name}** × ${count}`).join('\n')
          : 'Your inventory is empty. Use `$shop` to browse items.'
      )
    ]
  });
}

// MINES GAME — virtual coins only
if (command === 'mines') {
  const amount = ecoAmount(args[0]);

  if (!amount || amount > 1000)
    return message.reply('Usage: `$mines amount` (maximum 1,000 🌙)');

  if (player.cash < amount)
    return message.reply('❌ Not enough cash.');

  player.cash -= amount;

  const mineCount = 3;
  const safeTiles = new Set();

  while (safeTiles.size < 6) {
    safeTiles.add(Math.floor(Math.random() * 9));
  }

  const row = new ActionRowBuilder();

  for (let i = 0; i < 9; i++) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`moon_mine_${message.id}_${i}`)
        .setLabel('❔')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  const gameMessage = await message.channel.send({
    embeds: [
      ecoEmbed('Moon Mines 💎', `Stake: **${amount} 🌙**\nFind safe tiles to earn a reward. Three tiles contain mines!`)
    ],
    components: [row]
  });

  client.minesGames.set(`mine:${gameMessage.id}`, {
    userId: message.author.id,
    guildId: message.guild.id,
    amount,
    mineCount,
    safeTiles: [...safeTiles],
    opened: [],
    ended: false
  });

  return;
}

/* ===== END PART 5B ===== */


/* ===== BOT LOGIN ===== */

client.login(process.env.DISCORD_TOKEN
