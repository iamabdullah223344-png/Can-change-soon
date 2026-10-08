const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log(`${client.user.tag} is online!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // $ prefix
  if (!message.content.startsWith("$")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // =========================
  // $ping
  // =========================
  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  // =========================
  // $pong
  // =========================
  if (command === "pong") {
    return message.reply("🏓 Ping!");
  }
});

// Login
client.login(process.env.TOKEN);
