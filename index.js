const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// ===============================
// SLASH COMMAND
// ===============================

const commands = [
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create a giveaway")
    .addStringOption(option =>
      option
        .setName("duration")
        .setDescription("Example: 10m, 1h, 1d")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("Number of winners")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(20)
    )
    .addStringOption(option =>
      option
        .setName("prize")
        .setDescription("Giveaway prize")
        .setRequired(true)
    )
    .toJSON()
];

// ===============================
// REGISTER COMMAND
// ===============================

const rest = new REST({ version: "10" })
  .setToken(process.env.TOKEN);

(async () => {
  try {

    console.log("Registering slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      {
        body: commands
      }
    );

    console.log("Slash commands registered!");

  } catch (error) {
    console.error(error);
  }
})();

// ===============================
// BOT READY
// ===============================

client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);
});

// ===============================
// SLASH COMMAND HANDLER
// ===============================

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "giveaway") {

    const duration = interaction.options.getString("duration");
    const winners = interaction.options.getInteger("winners");
    const prize = interaction.options.getString("prize");

    const time = parseDuration(duration);

    if (!time) {
      return interaction.reply({
        content:
          "❌ Invalid duration!\nUse `10s`, `10m`, `1h`, or `1d`.",
        ephemeral: true
      });
    }

    const endTime = Date.now() + time;

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎉 GIVEAWAY 🎉")
      .setDescription(
        `🎁 **Prize:** ${prize}\n\n` +
        `🏆 **Winners:** ${winners}\n` +
        `⏰ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
        `React with 🎉 to enter!\n\n` +
        `👑 **Hosted by:** ${interaction.user}`
      )
      .setFooter({
        text: "Good luck everyone! 🍀"
      })
      .setTimestamp(endTime);

    await interaction.reply({
      content: "✅ Giveaway created!",
      ephemeral: true
    });

    const giveaway = await interaction.channel.send({
      embeds: [embed]
    });

    await giveaway.react("🎉");

    // ===============================
    // END GIVEAWAY
    // ===============================

    setTimeout(async () => {

      try {

        const reaction =
          giveaway.reactions.cache.get("🎉");

        if (!reaction) {
          return interaction.channel.send(
            "❌ Nobody entered the giveaway."
          );
        }

        const users = await reaction.users.fetch();

        const participants = users.filter(
          user => !user.bot
        );

        if (participants.size === 0) {
          return interaction.channel.send(
            "❌ Nobody entered the giveaway."
          );
        }

        const winnersList = [];

        for (
          let i = 0;
          i < winners && participants.size > 0;
          i++
        ) {

          const winner =
            participants.random();

          winnersList.push(winner);

          participants.delete(winner.id);
        }

        const winnerText =
          winnersList.map(user => `${user}`).join(", ");

        const endedEmbed = new EmbedBuilder()
          .setColor("#57F287")
          .setTitle("🎊 GIVEAWAY ENDED 🎊")
          .setDescription(
            `🎁 **Prize:** ${prize}\n\n` +
            `🏆 **Winner${winners > 1 ? "s" : ""}:**\n` +
            `${winnerText}\n\n` +
            `🎉 Congratulations!`
          )
          .setFooter({
            text: "Giveaway ended"
          })
          .setTimestamp();

        await giveaway.edit({
          embeds: [endedEmbed]
        });

        await interaction.channel.send({
          content:
            `🎉 Congratulations ${winnerText}! ` +
            `You won **${prize}**!`
        });

      } catch (error) {
        console.error("Giveaway error:", error);
      }

    }, time);
  }
});

// ===============================
// DURATION FUNCTION
// ===============================

function parseDuration(duration) {

  const match =
    duration.match(/^(\d+)(s|m|h|d)$/i);

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
// LOGIN
// ===============================

client.login(process.env.TOKEN);
