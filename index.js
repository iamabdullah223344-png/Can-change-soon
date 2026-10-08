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
