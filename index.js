
const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, PermissionsBitField,
  ChannelType, ActionRowBuilder, ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const PREFIX = "$";
const GOLD = 0xD4AF37;
const WARNINGS = new Map();
const GIVEAWAYS = new Map();
const economyFile = "./economy.json";

let economy = {};
try {
  economy = JSON.parse(fs.readFileSync(economyFile, "utf8"));
} catch {
  economy = {};
}

function saveEconomy() {
  try {
    fs.writeFileSync(economyFile, JSON.stringify(economy, null, 2));
  } catch (error) {
    console.error("Economy save error:", error);
  }
}

function account(id) {
  if (!economy[id]) {
    economy[id] = { cash: 100, bank: 0, lastDaily: 0 };
  }
  return economy[id];
}

function gold(title, description = "") {
  return new EmbedBuilder()
    .setColor(GOLD)
    .setTitle(`👑 ${title}`)
    .setDescription(description)
    .setFooter({ text: "✦ GOLDEN LUXURY ✦" })
    .setTimestamp();
}

async function reply(message, embed) {
  return message.reply({ embeds: [embed] });
}

function durationMs(input) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(input || "");
  if (!match) return null;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

function pickWinner(users) {
  return users[Math.floor(Math.random() * users.length)];
}

client.once("ready", () => {
  console.log(`👑 ${client.user.tag} is online!`);
});

client.on("error", console.error);

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = (args.shift() || "").toLowerCase();
  const target = message.mentions.members.first();
  const member = message.member;
  const guild = message.guild;

  try {
    // PART 2 COMMANDS GO HERE
  } catch (error) {
    console.error(`Command ${cmd} failed:`, error);
    await message.reply("⚠️ This command failed. Check the bot logs and permissions.")
      .catch(() => {});
  }
});

// PART 3 INTERACTIONS GO HERE

client.login(process.env.TOKEN);
      
