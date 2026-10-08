const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// ==========================
// BOT READY
// ==========================

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} is online!`);
});

// ==========================
// MESSAGE COMMANDS
// ==========================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // $ prefix
  if (!message.content.startsWith("$")) return;

  const args = message.content
    .slice(1)
    .trim()
    .split(/ +/);

  const command = args.shift().toLowerCase();

  // ==========================
  // GIVEAWAY COMMAND
  // ==========================

  if (command === "giveaway") {

    const duration = args[0];
    const winners = parseInt(args[1]);
    const prize = args.slice(2).join(" ");

    // Check command
    if (!duration || !winners || !prize) {
      return message.reply(
        "❌ **Wrong usage!**\n\n" +
        "Use:\n" +
        "`$giveaway <time> <winners> <prize>`\n\n" +
        "Example:\n" +
        "`$giveaway 10m 1 Nitro`"
      );
    }

    // Convert time
    const match = duration.match(/^(\d+)(s|m|h|d)$/i);

    if (!match) {
      return message.reply(
        "❌ Invalid time!\n\n" +
        "Use `10s`, `10m`, `1h`, or `1d`."
      );
    }

    const number = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    const time = number * units[unit];

    if (winners < 1 || winners > 20) {
      return message.reply(
        "❌ Winners must be between **1 and 20**."
      );
    }

    const endTime = Date.now() + time;

    // ==========================
    // GIVEAWAY EMBED
    // ==========================

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎉・GIVEAWAY")
      .setDescription(
        `🎁 **Prize**\n` +
        `${prize}\n\n` +

        `🏆 **Winners:** ${winners}\n` +

        `⏰ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\n` +

        `React with 🎉 to enter!\n\n` +

        `👑 **Hosted by:** ${message.author}`
      )
      .setFooter({
        text: "Good luck everyone! 🍀"
      })
      .setTimestamp(endTime);

    // Send giveaway
    const giveawayMessage = await message.channel.send({
      embeds: [embed]
    });

    // Add reaction
    await giveawayMessage.react("🎉");

    // ==========================
    // END GIVEAWAY
    // ==========================

    setTimeout(async () => {

      try {

        const reaction =
          giveawayMessage.reactions.cache.get("🎉");

        if (!reaction) {
          return message.channel.send(
            "❌ Giveaway ended with no entries."
          );
        }

        const users = await reaction.users.fetch();

        const participants = users.filter(
          user => !user.bot
        );

        if (participants.size === 0) {
          return message.channel.send(
            "❌ Giveaway ended with no entries."
          );
        }

        // Select winners
        const winnersList = [];

        for (
          let i = 0;
          i < winners && participants.size > 0;
          i++
        ) {

          const winner = participants.random();

          winnersList.push(winner);

          participants.delete(winner.id);
        }

        const winnerText = winnersList
          .map(user => `${user}`)
          .join(", ");

        // Ended embed
        const endedEmbed = new EmbedBuilder()
          .setColor("#57F287")
          .setTitle("🎊・GIVEAWAY ENDED")
          .setDescription(
            `🎁 **Prize**\n` +
            `${prize}\n\n` +

            `🏆 **Winner${winnersList.length > 1 ? "s" : ""}**\n` +
            `${winnerText}\n\n` +

            `🎉 Congratulations!`
          )
          .setFooter({
            text: "Thanks for participating! 🍀"
          })
          .setTimestamp();

        await giveawayMessage.edit({
          embeds: [endedEmbed]
        });

        await message.channel.send(
          `🎉 Congratulations ${winnerText}! ` +
          `You won **${prize}**!`
        );

      } catch (error) {

        console.error("Giveaway error:", error);

      }

    }, time);
  }
});

// ==========================
// LOGIN
// ==========================

client.login(process.env.TOKEN);

