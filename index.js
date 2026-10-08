const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "$";

client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // PING
  if (message.content === `${prefix}ping`) {
    return message.reply("🏓 Pong!");
  }

  // PONG
  if (message.content === `${prefix}pong`) {
    return message.reply("🏓 Ping!");
  }

  // GIVEAWAY
  if (message.content.startsWith(`${prefix}giveaway`)) {
    const args = message.content.split(" ").slice(1);

    if (args.length < 2) {
      return message.reply(
        "❌ Usage: `$giveaway <duration> <prize>`\nExample: `$giveaway 10m Nitro`"
      );
    }

    const duration = args[0];
    const prize = args.slice(1).join(" ");

    const time = parseDuration(duration);

    if (!time) {
      return message.reply(
        "❌ Invalid duration! Use `s`, `m`, `h`, or `d`.\nExample: `$giveaway 10m Nitro`"
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🎉 GIVEAWAY 🎉")
      .setDescription(
        `**Prize:** ${prize}\n\nReact with 🎉 to enter!\n\n**Ends:** <t:${Math.floor(
          (Date.now() + time) / 1000
        )}:R>`
      )
      .setColor("Random")
      .setFooter({ text: `Hosted by ${message.author.tag}` })
      .setTimestamp();

    const giveawayMessage = await message.channel.send({
      embeds: [embed]
    });

    await giveawayMessage.react("🎉");

    setTimeout(async () => {
      const fetchedMessage = await message.channel.messages.fetch(
        giveawayMessage.id
      );

      const reaction = fetchedMessage.reactions.cache.get("🎉");

      if (!reaction) {
        return message.channel.send(
          `🎉 Giveaway ended!\nNo one entered for **${prize}**.`
        );
      }

      const users = await reaction.users.fetch();
      const entrants = users.filter((user) => !user.bot);

      if (entrants.size === 0) {
        return message.channel.send(
          `🎉 Giveaway ended!\nNo one entered for **${prize}**.`
        );
      }

      const winner =
        entrants.random();

      message.channel.send(
        `🎉 **Giveaway ended!** Congratulations ${winner}! You won **${prize}**!`
      );
    }, time);
  }
});

function parseDuration(duration) {
  const match = duration.match(/^(\d+)(s|m|h|d)$/i);

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * units[unit];
}

client.login(process.env.TOKEN);
