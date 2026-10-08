const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

const giveaways = new Map();

// ===============================
// GIVEAWAY COMMAND
// ===============================

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("$")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // $giveaway 10m 1 Nitro
  if (command === "giveaway") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply("❌ You need **Manage Server** permission.");
    }

    const duration = args.shift();
    const winners = parseInt(args.shift());
    const prize = args.join(" ");

    if (!duration || !winners || !prize) {
      return message.reply(
        "❌ Usage: `$giveaway <duration> <winners> <prize>`\n" +
        "Example: `$giveaway 10m 1 Nitro`"
      );
    }

    const time = parseDuration(duration);

    if (!time || time < 5000) {
      return message.reply("❌ Invalid duration. Example: `10s`, `10m`, `1h`, `1d`.");
    }

    if (winners < 1 || winners > 20) {
      return message.reply("❌ Winners must be between **1 and 20**.");
    }

    const endTime = Date.now() + time;

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎉 GIVEAWAY 🎉")
      .setDescription(
        `## 🎁 ${prize}\n\n` +
        `🏆 **Winners:** ${winners}\n` +
        `⏰ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
        `React with 🎉 to enter!\n\n` +
        `**Hosted by:** ${message.author}`
      )
      .setFooter({ text: "Good luck everyone! 🍀" })
      .setTimestamp(endTime);

    const giveawayMessage = await message.channel.send({
      embeds: [embed]
    });

    await giveawayMessage.react("🎉");

    const giveawayData = {
      messageId: giveawayMessage.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
      prize,
      winners,
      host: message.author.id,
      endTime
    };

    giveaways.set(giveawayMessage.id, giveawayData);

    setTimeout(() => {
      endGiveaway(giveawayMessage.id);
    }, time);
  }

  // ===============================
  // END GIVEAWAY
  // ===============================

  if (command === "end") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply("❌ You need **Manage Server** permission.");
    }

    const messageId = args[0];

    if (!messageId) {
      return message.reply("❌ Usage: `$end <giveaway-message-id>`");
    }

    if (!giveaways.has(messageId)) {
      return message.reply("❌ Giveaway not found or already ended.");
    }

    await endGiveaway(messageId);
    message.reply("✅ Giveaway has been ended!");
  }

  // ===============================
  // REROLL
  // ===============================

  if (command === "reroll") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply("❌ You need **Manage Server** permission.");
    }

    const messageId = args[0];

    if (!messageId) {
      return message.reply("❌ Usage: `$reroll <giveaway-message-id>`");
    }

    const channel = message.channel;

    try {
      const giveawayMessage = await channel.messages.fetch(messageId);

      const reaction = giveawayMessage.reactions.cache.get("🎉");

      if (!reaction) {
        return message.reply("❌ No giveaway reaction found.");
      }

      const users = await reaction.users.fetch();

      const participants = users
        .filter(user => !user.bot)
        .map(user => user);

      if (participants.length === 0) {
        return message.reply("❌ There are no participants.");
      }

      const winner =
        participants[Math.floor(Math.random() * participants.length)];

      const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle("🎊 GIVEAWAY REROLL 🎊")
        .setDescription(
          `🎁 **Prize:** ${giveaways.get(messageId)?.prize || "Giveaway"}\n\n` +
          `🏆 **New Winner:** ${winner}\n\n` +
          `Congratulations! 🎉`
        )
        .setTimestamp();

      return message.channel.send({
        content: `🎉 Congratulations ${winner}!`,
        embeds: [embed]
      });

    } catch (error) {
      console.error(error);
      message.reply("❌ I couldn't find that giveaway message.");
    }
  }
});

// ===============================
// END GIVEAWAY FUNCTION
// ===============================

async function endGiveaway(messageId) {

  const giveaway = giveaways.get(messageId);

  if (!giveaway) return;

  try {

    const channel = await client.channels.fetch(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);

    const reaction = message.reactions.cache.get("🎉");

    if (!reaction) {
      giveaways.delete(messageId);
      return;
    }

    const users = await reaction.users.fetch();

    const participants = users
      .filter(user => !user.bot)
      .map(user => user);

    if (participants.length === 0) {

      const embed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle("🎉 GIVEAWAY ENDED")
        .setDescription(
          `🎁 **Prize:** ${giveaway.prize}\n\n` +
          `❌ **No one entered the giveaway.**`
        )
        .setTimestamp();

      await message.edit({ embeds: [embed] });

      giveaways.delete(messageId);
      return;
    }

    // Pick winners
    const winners = [];

    for (let i = 0; i < giveaway.winners && participants.length > 0; i++) {

      const index = Math.floor(Math.random() * participants.length);

      winners.push(participants[index]);

      participants.splice(index, 1);
    }

    const winnerText = winners.map(user => `${user}`).join(", ");

    const embed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("🎊 GIVEAWAY ENDED 🎊")
      .setDescription(
        `🎁 **Prize:** ${giveaway.prize}\n\n` +
        `🏆 **Winner${winners.length > 1 ? "s" : ""}:**\n${winnerText}\n\n` +
        `🎉 Congratulations!`
      )
      .setFooter({ text: "Thanks for participating!" })
      .setTimestamp();

    await message.edit({
      embeds: [embed]
    });

    await channel.send({
      content: `🎉 Congratulations ${winnerText}! You won **${giveaway.prize}**!`
    });

    giveaways.delete(messageId);

  } catch (error) {
    console.error("Giveaway Error:", error);
  }
}

// ===============================
// DURATION CONVERTER
// ===============================

function parseDuration(duration) {

  const match = duration.match(/^(\d+)(s|m|h|d)$/i);

  if (!match) return null;

  const number = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return number * units[unit];
}

// ===============================
// BOT LOGIN
// ===============================

client.login(process.env.TOKEN);
