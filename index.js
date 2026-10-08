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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith("$")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    return message.reply("🏓 Pong!");
  }

  if (command === "balance" || command === "bal") {
    return message.reply("💰 Your balance is **1,000 coins**!");
  }
});

client.login(process.env.TOKEN);
