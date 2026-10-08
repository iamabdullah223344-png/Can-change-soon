const { Client, GatewayIntentBits } = require("discord.js");

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

  if (message.content === `${prefix}ping`) {
    message.reply("🏓 Pong!");
  }

  if (message.content === `${prefix}pong`) {
    message.reply("🏓 Ping!");
  }
});

client.login(process.env.TOKEN);
