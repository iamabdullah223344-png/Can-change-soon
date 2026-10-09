const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

const prefix = '!';

client.once('ready', () => {
console.log("Bot is online: ${client.user.tag}");
});

client.on('messageCreate', async (message) => {
if (message.author.bot) return;
if (!message.content.startsWith(prefix)) return;

const args = message.content.slice(prefix.length).trim().split(/\s+/);
const command = args.shift().toLowerCase();

// Ping command
if (command === 'ping') {
    return message.reply('🏓 Pong!');
}

// Pong command
if (command === 'pong') {
    return message.reply('🏓 Ping!');
}

// Merge message content
if (command === 'say') {
    const text = args.join(' ');

    if (!text) {
        return message.reply('❌ Please provide some text!');
    }

    return message.reply(text);
}

});

client.login(process.env.DISCORD_TOKEN);
