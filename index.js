
console.log("Starting bot...");

try {
  require("dotenv").config();

  const {
    Client,
    GatewayIntentBits
  } = require("discord.js");

  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    throw new Error("DISCORD_TOKEN is missing from Secrets.");
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const text = message.content.trim().toLowerCase();

    try {
      if (text === "!ping" || text === "ping") {
        await message.reply("🏓 Pong!");
      } else if (text === "!pong" || text === "pong") {
        await message.reply("🏓 Ping!");
      }
    } catch (err) {
      console.error("Reply error:", err);
    }
  });

  client.once("ready", () => {
    console.log(`Bot online: ${client.user.tag}`);
  });

  client.on("error", (err) => {
    console.error("Discord client error:", err);
  });

  client.login(token).catch((err) => {
    console.error("Login failed:", err.message);
  });

} catch (err) {
  console.error("Startup failed:", err);
    }



      

