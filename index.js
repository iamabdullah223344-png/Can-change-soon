
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require("discord.js");


const PREFIX = "$";
const GOLD = 0xD4AF37;

if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN in Railway Variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// These maps are temporary and reset after a restart.
const giveaways = new Map();
const tickets = new Map();
const warnings = new Map();

const luxury = (title, description) =>
  new EmbedBuilder()
    .setColor(GOLD)
    .setTitle(`👑 ${title}`)
    .setDescription(description)
    .setTimestamp();

const has = (member, permission) =>
  member.permissions.has(permission);

function durationMs(input) {
  const match = /^(\d+)(m|h|d)$/i.exec(input || "");
  if (!match) return null;

  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms = n * (
    unit === "m" ? 60000 :
    unit === "h" ? 3600000 : 86400000
  );

  return Number.isSafeInteger(ms) && n > 0 ? ms : null;
}

client.once("ready", () => {
  console.log(`👑 Online as ${client.user.tag}`);
  console.log("🖤 Black & Gold commands loaded.");
});

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const parts = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = (parts.shift() || "").toLowerCase();
  const args = parts;
  if (!cmd) return;

  const ADMIN = PermissionsBitField.Flags.Administrator;
  const MOD = PermissionsBitField.Flags.ModerateMembers;
  const MANAGE_MESSAGES = PermissionsBitField.Flags.ManageMessages;
  const MANAGE_CHANNELS = PermissionsBitField.Flags.ManageChannels;

  try {
    switch (cmd) {
      case "help":
        return message.reply({
          embeds: [luxury("LUXURY COMMANDS", [
            "**GENERAL**",
            "`$ping` `$help` `$serverinfo` `$userinfo`",
            "`$membercount` `$avatar` `$8ball` `$poll`",
            "",
            "**MODERATION**",
            "`$ban @user reason` `$kick @user reason`",
            "`$mute @user 10m` `$unmute @user`",
            "`$warn @user reason` `$warnings @user`",
            "`$purge 10` `$lock` `$unlock` `$slowmode 5`",
            "",
            "**GIVEAWAYS**",
            "`$gstart 10m 1 Prize` `$gend ID` `$greroll ID`",
            "",
            "**TICKETS & VERIFICATION**",
            "`$ticketpanel` `$close` `$verifysetup`"
          ].join("\n"))]
        });

      case "ping":
        return message.reply(`🏓 Pong! ${client.ws.ping}ms`);

      case "serverinfo": {
        const g = message.guild;
        return message.reply({
          embeds: [luxury("SERVER INFORMATION",
            `**Name:** ${g.name}\n` +
            `**Members:** ${g.memberCount}\n` +
            `**Created:** <t:${Math.floor(g.createdTimestamp / 1000)}:D>`
          )]
        });
      }

      case "membercount":
        return message.reply(
          `👑 **${message.guild.name}** has **${message.guild.memberCount}** members.`
        );

      case "userinfo": {
        const user = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(user.id).catch(() => null);
        return message.reply({
          embeds: [luxury("USER PROFILE",
            `**User:** ${user.tag}\n` +
            `**ID:** ${user.id}\n` +
            `**Joined:** ${member?.joinedTimestamp
              ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`
              : "Unknown"}\n` +
            `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:D>`
          ).setThumbnail(user.displayAvatarURL())]
        });
      }

      case "avatar": {
        const user = message.mentions.users.first() || message.author;
        return message.reply(user.displayAvatarURL({ size: 1024 }));
      }

      case "8ball": {
        if (!args.length) {
          return message.reply("Ask a question! Example: `$8ball Will I win?`");
        }
        const answers = [
          "Absolutely! 👑",
          "The signs look good ✨",
          "Maybe. Try again later.",
          "Not looking likely.",
          "Only time will tell."
        ];
        return message.reply(
          `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`
        );
      }

      case "poll": {
        if (!args.length) {
          return message.reply("Usage: `$poll Should we host an event?`");
        }
        const poll = await message.channel.send({
          embeds: [luxury("COMMUNITY POLL", args.join(" "))]
        });
        await poll.react("👍");
        await poll.react("👎");
        return;
  }

    
client.login(process.env.DISCORD_TOKEN);
