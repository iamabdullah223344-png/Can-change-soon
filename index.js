
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

const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel]
});

const PREFIX = "$";
const DATA_DIR = path.join(__dirname, "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData(name) {
  const file = path.join(DATA_DIR, `${name}.json`);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}");
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Could not load ${name}:`, error);
    return {};
  }
}

function saveData(name, data) {
  fs.writeFileSync(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(data, null, 2)
  );
}

const warnings = loadData("warnings");
const economy = loadData("economy");
const giveaways = loadData("giveaways");
const tickets = loadData("tickets");

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function getMember(message, input) {
  return (
    message.mentions.members.first() ||
    message.guild.members.cache.get(input)
  );
}

client.once("ready", () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  client.user.setActivity("$help | Premium Bot");
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = (args.shift() || "").toLowerCase();

  if (!command) return;

  try {
    // PART 2: GENERAL COMMANDS GO HERE

    // ========== PART 2: GENERAL COMMANDS ==========

    if (command === "ping") {
      return message.reply(`🏓 Pong! **${client.ws.ping}ms**`);
    }

    if (command === "help") {
      return message.reply({
        embeds: [
          makeEmbed(
            "✦ CHILLING HANGOUT BOT COMMANDS",
            "**GENERAL**\n" +
            "`$ping` `$help` `$serverinfo` `$userinfo` `$membercount` `$avatar` `$8ball` `$poll`\n\n" +
            "**MODERATION**\n" +
            "`$ban` `$kick` `$mute` `$warn` `$warnings` `$purge` `$lock` `$unlock` `$slowmode`\n\n" +
            "**GIVEAWAYS**\n" +
            "`$gstart` `$gend` `$greroll`\n\n" +
            "**TICKETS & VERIFICATION**\n" +
            "`$ticketpanel` `$close` `$verifysetup`\n\n" +
            "**OWO-STYLE ECONOMY**\n" +
            "`$hunt` `$battle` `$daily` `$balance` `$leaderboard` `$coinflip` `$bj` `$work` `$beg` `$sell` `$inventory`"
          )
        ]
      });
    }

    if (command === "serverinfo") {
      const g = message.guild;
      const e = makeEmbed(
        `✦ ${g.name}`,
        `**Owner:** <@${g.ownerId}>\n` +
        `**Members:** ${g.memberCount}\n` +
        `**Channels:** ${g.channels.cache.size}\n` +
        `**Roles:** ${g.roles.cache.size}\n` +
        `**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:D>`
      );

      if (g.iconURL()) {
        e.setThumbnail(g.iconURL({ size: 256 }));
      }

      return message.reply({ embeds: [e] });
    }

    if (command === "userinfo") {
      const member = getMember(message, args[0]) || message.member;
      const u = member.user;

      const e = makeEmbed(
        `✦ ${u.username}`,
        `**User ID:** ${u.id}\n` +
        `**Joined:** ${
          member.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : "Unknown"
        }\n` +
        `**Account created:** <t:${Math.floor(u.createdTimestamp / 1000)}:D>\n` +
        `**Bot:** ${u.bot ? "Yes" : "No"}`
      );

      e.setThumbnail(u.displayAvatarURL({ size: 512 }));
      return message.reply({ embeds: [e] });
    }

    if (command === "membercount") {
      return message.reply(
        `👥 This server has **${message.guild.memberCount} members**.`
      );
    }

    if (command === "avatar") {
      const member = getMember(message, args[0]);
      const user =
        member?.user ||
        message.mentions.users.first() ||
        message.author;

      const url = user.displayAvatarURL({
        size: 1024,
        extension: "png"
      });

      const e = makeEmbed(
        `✦ ${user.username}'s Avatar`,
        `[Open Full Avatar](${url})`
      );

      e.setImage(url);
      return message.reply({ embeds: [e] });
    }

    if (command === "8ball") {
      if (!args.length) {
        return message.reply(
          "🎱 Ask a question! Example: `$8ball Will I win?`"
        );
      }

      const answers = [
        "Absolutely! ✨",
        "It looks likely. 🌟",
        "The signs point to yes. 👑",
        "Ask again later. 🔮",
        "Very doubtful. 🌙",
        "Definitely not. 🖤",
        "Only time will tell. 💫"
      ];

      const answer = answers[
        Math.floor(Math.random() * answers.length)
      ];

      return message.reply(`🎱 **${answer}**`);
    }

    if (command === "poll") {
      const question = args.join(" ");

      if (!question) {
        return message.reply(
          "📊 Usage: `$poll Should we host an event?`"
        );
      }

      const poll = await message.channel.send({
        embeds: [
          makeEmbed(
            "📊 COMMUNITY POLL",
            `**${question}**\n\n👍 = Yes\n👎 = No`
          )
        ]
      });

      await poll.react("👍");
      await poll.react("👎");
      return;
}
    
    // PART 3: MODERATION COMMANDS GO HERE

    // ========== PART 3: MODERATION COMMANDS ==========

    if (command === "ban") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
        return message.reply("❌ You need **Ban Members** permission.");

      const member = getMember(message, args[0]);
      if (!member)
        return message.reply("Usage: `$ban @user [reason]`");

      if (!member.bannable)
        return message.reply("❌ I cannot ban that member. Check role hierarchy.");

      const reason = args.slice(1).join(" ") || "No reason provided";
      await member.ban({ reason });

      return message.reply(`🔨 Banned **${member.user.tag}**. Reason: ${reason}`);
    }

    if (command === "kick") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
        return message.reply("❌ You need **Kick Members** permission.");

      const member = getMember(message, args[0]);
      if (!member)
        return message.reply("Usage: `$kick @user [reason]`");

      if (!member.kickable)
        return message.reply("❌ I cannot kick that member. Check role hierarchy.");

      const reason = args.slice(1).join(" ") || "No reason provided";
      await member.kick(reason);

      return message.reply(`👢 Kicked **${member.user.tag}**. Reason: ${reason}`);
    }

    if (command === "mute") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
        return message.reply("❌ You need **Moderate Members** permission.");

      const member = getMember(message, args[0]);
      if (!member)
        return message.reply("Usage: `$mute @user 10m [reason]`");

      const match = (args[1] || "10m").match(/^(\d+)(s|m|h|d)$/i);
      if (!match)
        return message.reply("❌ Use a duration like `10m`, `2h`, or `1d`.");

      const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      const duration = Number(match[1]) * units[match[2].toLowerCase()];

      if (duration < 1000 || duration > 28 * 86400000)
        return message.reply("❌ Duration must be between 1 second and 28 days.");

      if (!member.moderatable)
        return message.reply("❌ I cannot timeout this member.");

      await member.timeout(
        duration,
        args.slice(2).join(" ") || "Moderator action"
      );

      return message.reply(`🔇 Timed out **${member.user.tag}**.`);
    }

    if (command === "warn") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
        return message.reply("❌ You need **Manage Messages** permission.");

      const member = getMember(message, args[0]);
      if (!member)
        return message.reply("Usage: `$warn @user [reason]`");

      const key = `${message.guild.id}:${member.id}`;
      warnings[key] ||= [];

      const reason = args.slice(1).join(" ") || "No reason provided";

      warnings[key].push({
        reason,
        moderator: message.author.id,
        date: Date.now()
      });

      saveData("warnings", warnings);

      return message.reply(
        `⚠️ Warned **${member.user.tag}**. Reason: ${reason}`
      );
    }

    if (command === "warnings") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
        return message.reply("❌ You need **Manage Messages** permission.");

      const member = getMember(message, args[0]);
      if (!member)
        return message.reply("Usage: `$warnings @user`");

      const list = warnings[`${message.guild.id}:${member.id}`] || [];

      const description = list.length
        ? list.map((w, i) =>
            `**${i + 1}.** ${w.reason} — <@${w.moderator}>`
          ).join("\n")
        : "No warnings found.";

      return message.reply({
        embeds: [
          makeEmbed(`⚠️ Warnings for ${member.user.username}`, description)
        ]
      });
    }

    if (command === "purge") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
        return message.reply("❌ You need **Manage Messages** permission.");

      const amount = Number(args[0]);

      if (!Number.isInteger(amount) || amount < 1 || amount > 100)
        return message.reply("Usage: `$purge 1-100`");

      const deleted = await message.channel.bulkDelete(amount + 1, true);

      const notice = await message.channel.send(
        `🧹 Deleted ${Math.max(0, deleted.size - 1)} messages.`
      );

      setTimeout(() => notice.delete().catch(() => {}), 4000);
      return;
    }

    if (command === "lock" || command === "unlock") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ You need **Manage Channels** permission.");

      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        { SendMessages: command === "lock" ? false : null }
      );

      return message.reply(
        command === "lock" ? "🔒 Channel locked." : "🔓 Channel unlocked."
      );
    }

    if (command === "slowmode") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
        return message.reply("❌ You need **Manage Channels** permission.");

      const seconds = Number(args[0]);

      if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600)
        return message.reply("Usage: `$slowmode 0-21600`");

      await message.channel.setRateLimitPerUser(seconds);

      return message.reply(`⏱️ Slowmode set to **${seconds} seconds**.`);
  }
    
    // PART 4: GIVEAWAY COMMANDS GO HERE

    // ========== PART 4: GIVEAWAY COMMANDS ==========

    if (command === "gstart") {
      if (!message.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )) {
        return message.reply("❌ You need Manage Messages permission.");
      }

      const match = (args[0] || "").match(/^(\d+)(s|m|h|d)$/i);
      const winnersCount = Number(args[1]);
      const prize = args.slice(2).join(" ");

      if (!match || !Number.isInteger(winnersCount) ||
          winnersCount < 1 || winnersCount > 20 || !prize) {
        return message.reply(
          "🎉 Usage: `$gstart 1h 1 Nitro`\n" +
          "Format: duration, winner count, prize."
        );
      }

      const units = {
        s: 1000,
        m: 60000,
        h: 3600000,
        d: 86400000
      };

      const duration =
        Number(match[1]) * units[match[2].toLowerCase()];

      if (duration < 10000 || duration > 30 * 86400000) {
        return message.reply(
          "❌ Duration must be between 10 seconds and 30 days."
        );
      }

      const endAt = Date.now() + duration;

      const giveawayMessage = await message.channel.send({
        embeds: [
          makeEmbed(
            "🎉 PREMIUM GIVEAWAY",
            `**Prize:** ${prize}\n` +
            `**Winners:** ${winnersCount}\n` +
            `**Hosted by:** ${message.author}\n` +
            `**Ends:** <t:${Math.floor(endAt / 1000)}:R>\n\n` +
            "React with 🎉 to enter!"
          )
        ]
      });

      await giveawayMessage.react("🎉");

      giveaways[giveawayMessage.id] = {
        guildId: message.guild.id,
        channelId: message.channel.id,
        prize,
        winnersCount,
        endAt,
        ended: false,
        hostId: message.author.id
      };

      saveData("giveaways", giveaways);

      return message.reply(
        `✅ Giveaway created! Message ID: \`${giveawayMessage.id}\``
      );
    }

    if (command === "gend" || command === "greroll") {
      if (!message.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )) {
        return message.reply("❌ You need Manage Messages permission.");
      }

      const giveawayId = args[0];
      const data = giveaways[giveawayId];

      if (!data || data.guildId !== message.guild.id) {
        return message.reply(
          "❌ Giveaway not found. Usage: `$gend MESSAGE_ID`"
        );
      }

      if (command === "gend" && data.ended) {
        return message.reply("❌ This giveaway has already ended.");
      }

      if (command === "greroll" && !data.ended) {
        return message.reply(
          "❌ End the giveaway first using `$gend MESSAGE_ID`."
        );
      }

      const channel = message.guild.channels.cache.get(data.channelId);

      if (!channel || !channel.isTextBased()) {
        return message.reply("❌ Giveaway channel not found.");
      }

      const giveawayMessage = await channel.messages
        .fetch(giveawayId)
        .catch(() => null);

      if (!giveawayMessage) {
        return message.reply("❌ Giveaway message could not be found.");
      }

      const reaction = giveawayMessage.reactions.cache.get("🎉");

      const users = reaction
        ? await reaction.users.fetch()
        : new Map();

      const pool = [...users.values()].filter(user => !user.bot);

      if (command === "gend") {
        data.ended = true;
        data.endedAt = Date.now();
      }

      const winners = [];

      while (
        pool.length > 0 &&
        winners.length < (command === "gend" ? data.winnersCount : 1)
      ) {
        const index = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(index, 1)[0]);
      }

      saveData("giveaways", giveaways);

      if (command === "gend") {
        const endedEmbed = makeEmbed(
          "🎉 GIVEAWAY ENDED",
          `**Prize:** ${data.prize}\n` +
          `**Winner(s):** ${
            winners.length
              ? winners.map(user => `<@${user.id}>`).join(", ")
              : "No valid entries"
          }`
        );

        await giveawayMessage.edit({ embeds: [endedEmbed] });
      }

      if (winners.length === 0) {
        return message.reply("😔 No eligible entrants were found.");
      }

      return message.reply(
        `🎉 **${command === "greroll" ? "New winner" : "Winner(s)"}:** ` +
        `${winners.map(user => `<@${user.id}>`).join(", ")}\n` +
        `**Prize:** ${data.prize}`
      );
        }
        
    // PART 5: TICKET AND VERIFICATION COMMANDS GO HERE

// $verifypanel @Verified
    if (command === "verifypanel") {
      if (!message.member.permissions.has("ManageRoles")) {
        return message.reply("❌ You need Manage Roles permission.");
      }

      const role = message.mentions.roles.first();

      if (!role) {
        return message.reply("❌ Usage: `$verifypanel @Verified`");
      }

      const embed = makeEmbed(
        "🔐 CHILLING HANGOUT | VERIFICATION",
        `Welcome to **Chilling Hangout**!\n\n` +
        `**Verification Role:** <@&${role.id}>\n\n` +
        "Click below to unlock server access."
      );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_${role.id}`)
          .setLabel("Channel Access ✅")
          .setStyle(ButtonStyle.Success)
      );

      return message.channel.send({
        embeds: [embed],
        components: [row]
      });
    }

    // $ticketpanel @TicketStaff
    if (command === "ticketpanel") {
      if (!message.member.permissions.has("ManageChannels")) {
        return message.reply("❌ You need Manage Channels permission.");
      }

      const staffRole = message.mentions.roles.first();

      if (!staffRole) {
        return message.reply("❌ Usage: `$ticketpanel @TicketStaff`");
      }

      const embed = makeEmbed(
        "🎟️ CHILLING HANGOUT SUPPORTER",
        "Need assistance? Our support team is here for you.\n\n" +
        "✦ Member Support\n" +
        "✦ Reports & Issues\n" +
        "✦ General Questions\n\n" +
        `**Chosen Staff Role:** <@&${staffRole.id}>\n\n` +
        "Click below to open a private support ticket."
      );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_open_${staffRole.id}`)
          .setLabel("Open Support Ticket 🎟️")
          .setStyle(ButtonStyle.Primary)
      );

      return message.channel.send({
        embeds: [embed],
        components: [row]
      });
    }
    





    
    
    // PART 6: OWO-STYLE ECONOMY COMMANDS GO HERE

    // ========== PART 6: ECONOMY COMMANDS ==========

    function getAccount(userId) {
      if (!economy[userId]) {
        economy[userId] = {
          cash: 0,
          bank: 0,
          lastDaily: 0,
          lastHunt: 0
        };
      }

      return economy[userId];
    }

    function saveEconomy() {
      saveData("economy", economy);
    }

    function randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    if (command === "balance" || command === "bal") {
      const account = getAccount(message.author.id);

      return message.reply({
        embeds: [
          makeEmbed(
            "💰・YOUR WALLET",
            `👤 **User:** ${message.author}\n` +
            `💵 **Cash:** ${account.cash.toLocaleString()}\n` +
            `🏦 **Bank:** ${account.bank.toLocaleString()}\n` +
            `✨ **Total:** ${(account.cash + account.bank).toLocaleString()}`
          )
        ]
      });
    }

    if (command === "daily") {
      const account = getAccount(message.author.id);
      const cooldown = 24 * 60 * 60 * 1000;
      const remaining = cooldown - (Date.now() - account.lastDaily);

      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);

        return message.reply(
          `⏳ Daily reward available in **${hours}h ${minutes}m**.`
        );
      }

      const reward = randomInt(500, 1500);

      account.cash += reward;
      account.lastDaily = Date.now();
      saveEconomy();

      return message.reply(
        `🎁 ${message.author}, you received **${reward.toLocaleString()} coins**!`
      );
    }

    if (command === "hunt") {
      const account = getAccount(message.author.id);
      const cooldown = 30 * 1000;
      const remaining = cooldown - (Date.now() - account.lastHunt);

      if (remaining > 0) {
        return message.reply(
          `⏳ Hunt again in **${Math.ceil(remaining / 1000)} seconds**.`
        );
      }

      account.lastHunt = Date.now();

      const animals = [
        "🐰 Rabbit",
        "🦊 Fox",
        "🐺 Wolf",
        "🐻 Bear",
        "🦌 Deer",
        "🐉 Dragon"
      ];

      const animal = animals[randomInt(0, animals.length - 1)];
      const reward = randomInt(100, 600);

      account.cash += reward;
      saveEconomy();

      return message.reply(
        `🏹 You hunted **${animal}** and earned **${reward} coins**!`
      );
    }

    if (command === "battle") {
      const target = message.mentions.users.first();

      if (!target || target.bot || target.id === message.author.id) {
        return message.reply(
          "⚔️ Usage: `$battle @user` — mention another member."
        );
      }

      const account = getAccount(message.author.id);
      const opponent = getAccount(target.id);

      const winnerIsYou = Math.random() < 0.5;
      const winner = winnerIsYou ? account : opponent;
      const loser = winnerIsYou ? opponent : account;
      const prize = randomInt(100, 400);

      if (winnerIsYou) {
        winner.cash += prize;
        loser.cash = Math.max(0, loser.cash - prize);
      } else {
        winner.cash += prize;
        loser.cash = Math.max(0, loser.cash - prize);
      }

      saveEconomy();

      return message.reply(
        `⚔️ **Battle Results**\n` +
        `${winnerIsYou ? message.author : target} wins!\n` +
        `🏆 Prize: **${prize} coins**`
      );
    }

    if (command === "leaderboard" || command === "lb") {
      const ranking = Object.entries(economy)
        .map(([id, data]) => ({
          id,
          total: (Number(data.cash) || 0) + (Number(data.bank) || 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      if (ranking.length === 0) {
        return message.reply("📊 No economy players yet. Try `$daily`!");
      }

      const lines = ranking.map((entry, index) =>
        `**${index + 1}.** <@${entry.id}> — 💰 ${entry.total.toLocaleString()}`
      );

      return message.reply({
        embeds: [
          makeEmbed("🏆・RICH LIST", lines.join("\n"))
        ]
      });
    }

    if (command === "coinflip") {
      const bet = Number(args[0]);
      const choice = (args[1] || "").toLowerCase();

      if (
        !Number.isSafeInteger(bet) ||
        bet < 1 ||
        !["heads", "tails"].includes(choice)
      ) {
        return message.reply(
          "🪙 Usage: `$coinflip 100 heads`\nChoose `heads` or `tails`."
        );
      }

      const account = getAccount(message.author.id);

      if (account.cash < bet) {
        return message.reply("❌ You don't have enough cash for that bet.");
      }

      const result = Math.random() < 0.5 ? "heads" : "tails";
      const won = result === choice;

      account.cash += won ? bet : -bet;
      saveEconomy();

      return message.reply(
        `🪙 It landed on **${result}**!\n` +
        (won
          ? `🎉 You won **${bet} coins**!`
          : `😔 You lost **${bet} coins**.`)
      );
    }

    if (command === "bj") {
      const bet = Number(args[0]);

      if (!Number.isSafeInteger(bet) || bet < 1) {
        return message.reply("🃏 Usage: `$bj 100`");
      }

      const account = getAccount(message.author.id);

      if (account.cash < bet) {
        return message.reply("❌ You don't have enough cash.");
      }

      const player = randomInt(12, 21);
      const dealer = randomInt(15, 21);

      if (player > dealer) {
        account.cash += bet;
        saveEconomy();

        return message.reply(
          `🃏 You: **${player}** | Dealer: **${dealer}**\n` +
          `🎉 You won **${bet} coins**!`
        );
      }

      if (player === dealer) {
        saveEconomy();

        return message.reply(
          `🃏 You: **${player}** | Dealer: **${dealer}**\n` +
          "🤝 Draw! Your bet was returned."
        );
      }

      account.cash -= bet;
      saveEconomy();

      return message.reply(
        `🃏 You: **${player}** | Dealer: **${dealer}**\n` +
        `😔 You lost **${bet} coins**.`
      );
        }
    
  } catch (error) {
    console.error(`❌ Error in $${command}:`, error);

    await message.reply(
      "❌ Something went wrong. Please check the bot logs."
    ).catch(() => {});
  }
});

// Keep your bot token secret.
// Add TOKEN as an environment variable in Railway.
if (!process.env.TOKEN) {
  console.error("❌ Missing TOKEN environment variable in Railway.");
} else {
  client.login(process.env.TOKEN).catch((error) => {
    console.error("❌ Discord login failed:", error);
  });
    }
    
