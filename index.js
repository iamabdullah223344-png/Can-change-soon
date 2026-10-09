
const { Client, GatewayIntentBits } = require("discord.js");

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("❌ Missing DISCORD_TOKEN in Secrets!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    const content = message.content.toLowerCase().trim();

    if (content === "ping" || content === "!ping") {
      await message.reply("🏓 Pong!");
    } else if (content === "pong" || content === "!pong") {
      await message.reply("🏓 Ping!");
    }
  } catch (error) {
    console.error("Message error:", error);
  }
});

client.once("ready", () => {
  console.log(`✅ Online as ${client.user.tag}`);
});

client.on("error", (error) => {
  console.error("Discord error:", error);
});

client.login(token).catch((error) => {
  console.error("❌ Login failed:", error.message);
});


      

