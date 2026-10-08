const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Bot online
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} is online!`);
});

// Commands
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // $ prefix
  if (!message.content.startsWith("$")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // =========================
  // $mute
  // =========================

  if (command === "mute") {

    // Permission check
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.ModerateMembers
    )) {
      return message.reply(
        "❌ You need **Moderate Members** permission."
      );
    }

    // Get mentioned user
    const member = message.mentions.members.first();

    if (!member) {
      return message.reply(
        "❌ Mention someone to mute.\n" +
        "Example: `$mute @User 10m Spamming`"
      );
    }

    // Duration
    const duration = args[1] || "10m";

    const match = duration.match(
      /^(\d+)(s|m|h|d)$/i
    );

    if (!match) {
      return message.reply(
        "❌ Invalid duration!\n" +
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

    // Discord timeout maximum is 28 days
    if (time > 28 * 24 * 60 * 60 * 1000) {
      return message.reply(
        "❌ Maximum mute duration is **28 days**."
      );
    }

    // Can't mute yourself
    if (member.id === message.author.id) {
      return message.reply(
        "❌ You can't mute yourself."
      );
    }

    // Can't mute the server owner
    if (member.id === message.guild.ownerId) {
      return message.reply(
        "❌ You can't mute the server owner."
      );
    }

    // Role hierarchy check
    if (
      member.roles.highest.position >=
      message.member.roles.highest.position
    ) {
      return message.reply(
        "❌ You can't mute someone with an equal or higher role."
      );
    }

    // Bot role hierarchy check
    if (
      member.roles.highest.position >=
      message.guild.members.me.roles.highest.position
    ) {
      return message.reply(
        "❌ My role must be higher than the member's highest role."
      );
    }

    try {

      await member.timeout(
        time,
        args.slice(2).join(" ") || "No reason provided"
      );

      return message.reply(
        `🔇 **${member.user.tag}** has been muted for **${duration}**.`
      );

    } catch (error) {

      console.error(error);

      return message.reply(
        "❌ I couldn't mute that member. Check my permissions and role position."
      );
    }
  }
});

// Login
client.login(process.env.TOKEN);
