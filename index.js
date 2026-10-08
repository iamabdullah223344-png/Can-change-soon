const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "$";

client.once("clientReady", () => {
  console.log(`✅ ${client.user.tag} is ONLINE!`);
});

  if (message.content.toLowerCase() === `${prefix}ping`) {
    message.reply("🏓 Pong! I'm working!");
  }
});

client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled error:", error);
});

client.login(process.env.TOKEN).catch((error) => {
  console.error("❌ LOGIN FAILED:", error);
});

if (message.content.startsWith("$giveaway")) {
  const args = message.content.split(" ");

  if (!args[1] || !args[2] || !args.slice(3).join(" ")) {
    return message.reply(
      "❌ Usage: `$giveaway <time> <winners> <prize>`\nExample: `$giveaway 10m 1 Nitro`"
    );
  }

  const time = args[1];
  const winners = parseInt(args[2]);
  const prize = args.slice(3).join(" ");

  if (isNaN(winners) || winners < 1) {
    return message.reply("❌ Winners must be a number greater than 0.");
  }

  let milliseconds;

  if (time.endsWith("s")) {
    milliseconds = parseInt(time) * 1000;
  } else if (time.endsWith("m")) {
    milliseconds = parseInt(time) * 60 * 1000;
  } else if (time.endsWith("h")) {
    milliseconds = parseInt(time) * 60 * 60 * 1000;
  } else if (time.endsWith("d")) {
    milliseconds = parseInt(time) * 24 * 60 * 60 * 1000;
  } else {
    return message.reply(
      "❌ Use time like `30s`, `10m`, `1h`, or `1d`."
    );
  }

  if (milliseconds <= 0) {
    return message.reply("❌ Invalid giveaway time.");
  }

  const giveawayMessage = await message.channel.send({
    embeds: [
      {
        title: "🎉 GIVEAWAY 🎉",
        description:
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winners}\n` +
          `**Ends:** <t:${Math.floor((Date.now() + milliseconds) / 1000)}:R>\n\n` +
          `React with 🎉 to enter!`,
        color: 0x8b5cf6,
        footer: {
          text: `Hosted by ${message.author.tag}`
        },
        timestamp: new Date()
      }
    ]
  });

  await giveawayMessage.react("🎉");

  setTimeout(async () => {
    try {
      const updatedMessage = await message.channel.messages.fetch(
        giveawayMessage.id
      );

      const reaction = updatedMessage.reactions.cache.get("🎉");

      if (!reaction) {
        return message.channel.send("❌ Giveaway ended with no entries.");
      }

      const users = await reaction.users.fetch();

      const participants = users.filter(
        (user) => !user.bot
      );

      if (participants.size === 0) {
        return message.channel.send("❌ Giveaway ended with no entries.");
      }

      const participantArray = [...participants.values()];

      const selectedWinners = [];

      while (
        selectedWinners.length < winners &&
        selectedWinners.length < participantArray.length
      ) {
        const random =
          participantArray[
            Math.floor(Math.random() * participantArray.length)
          ];

        if (!selectedWinners.includes(random)) {
          selectedWinners.push(random);
        }
      }

      const winnerText = selectedWinners
        .map((user) => `<@${user.id}>`)
        .join(", ");

      await message.channel.send({
        embeds: [
          {
            title: "🎊 GIVEAWAY ENDED 🎊",
            description:
              `**Prize:** ${prize}\n\n` +
              `🏆 **Winner(s):** ${winnerText}`,
            color: 0x22c55e,
            timestamp: new Date()
          }
        ]
      });
    } catch (error) {
      console.error("Giveaway error:", error);
    }
  }, milliseconds);
  }
