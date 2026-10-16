
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

const PREFIX = "$";

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

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

  const duration = amount * units[match[2].toLowerCase()];

  if (!Number.isSafeInteger(duration) || duration < 1000) {
    return null;
  }

  // Maximum giveaway duration: 30 days
  if (duration > 30 * 86400000) return null;

  return duration;
}

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content
      .slice(PREFIX.length)
      .trim()
      .split(/\s+/);

    const command = args.shift()?.toLowerCase();

    // PING COMMAND
    if (command === "ping") {
      return message.reply(
        `🏓 Pong! Bot latency: ${client.ws.ping}ms`
      );
    }

    // GIVEAWAY COMMAND
    // Usage: $giveaway 10m Nitro
    if (command === "giveaway") {
      if (!message.member.permissions.has("ManageGuild")) {
        return message.reply(
          "❌ You need the Manage Server permission to start giveaways."
        );
      }

      const duration = parseDuration(args[0] || "");
      const prize = args.slice(1).join(" ");

      if (!duration || !prize) {
        return message.reply(
          "❌ Usage: `$giveaway 10m Nitro`\n" +
          "Time units: s, m, h, d. Maximum: 30 days."
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
        .setFooter({ text: "Good luck everyone!" })
        .setTimestamp(endTime);

      const giveawayMessage = await message.channel.send({
        embeds: [embed]
      });

      await giveawayMessage.react("🎉");

      await message.reply("✅ Giveaway created successfully!");

      setTimeout(async () => {
        try {
          const reaction =
            giveawayMessage.reactions.cache.get("🎉");

          if (!reaction) {
            await giveawayMessage.reply(
              "🎉 Giveaway ended, but no one entered."
            );
            return;
          }

          const users = await reaction.users.fetch();
          const entrants = users.filter(
            user => !user.bot
          );

          if (entrants.size === 0) {
            await giveawayMessage.reply(
              "🎉 Giveaway ended! Nobody entered."
            );
            return;
          }

          const winner = entrants.random();

          const endedEmbed = EmbedBuilder.from(embed)
            .setColor(0x2ECC71)
            .setTitle("🎉 GIVEAWAY ENDED 🎉")
            .setDescription(
              `**Prize:** ${prize}\n\n` +
              `**Winner:** ${winner}\n` +
              `**Hosted by:** ${message.author}`
            );

          await giveawayMessage.edit({
            embeds: [endedEmbed]
          });

          await giveawayMessage.reply(
            `🎊 Congratulations ${winner}! You won **${prize}**!`
          );
        } catch (error) {
          console.error("Giveaway ending error:", error);
        }
      }, duration);

      return;
    }
  } catch (error) {
    console.error("Command error:", error);

    if (message.channel) {
      await message.reply(
        "❌ Something went wrong with that command."
      ).catch(console.error);
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error("Bot login failed:", error);
});
