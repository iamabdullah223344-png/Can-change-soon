const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const PREFIX = '!'; // Your bot prefix

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/+/);
    const command = args.shift().toLowerCase();

    // Command to send the ticket panel
    if (command === 'setup-tickets') {
        // Check if user has administrator permissions
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You need Administrator permissions to use this command.');
        }

        // 1. Create the Embed Message Content
        const ticketEmbed = new EmbedBuilder()
            .setColor(0x5865F2) // Discord Blurple
            .setTitle('📩 Open a Support Ticket')
            .setDescription(
                'Need assistance? Click the button below to open a private support ticket.\n\n' +
                '**Before opening a ticket:**\n' +
                '• Please be patient, our staff will reply shortly.\n' +
                '• Do not ping staff members without a valid reason.\n' +
                '• Double-check if your question is answered in our FAQ.'
            )
            .setFooter({ text: 'Support System', iconURL: message.guild.iconURL() })
            .setTimestamp();

        // 2. Create the Button Components
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Create Ticket')
                .setEmoji('✉️')
                .setStyle(ButtonStyle.Primary)
        );

        // Send the panel to the channel
        await message.channel.send({ embeds: [ticketEmbed], components: [row] });
        return message.delete().catch(() => {}); // Delete the original setup command message
    }
});

// Handling the button interaction
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const member = interaction.member;

        // Check if a ticket category exists, or it will just create it at the top
        let category = guild.channels.cache.find(c => c.name === 'Tickets' && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: 'Tickets',
                type: ChannelType.GuildCategory,
            });
        }

        // Create the private ticket channel
        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone role
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id, // The user who opened the ticket
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                },
                // Add your Staff Role ID here if you want staff to see it automatically:
                /*
                {
                    id: 'YOUR_STAFF_ROLE_ID',
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                }
                */
            ],
        });

        // Send a welcome message inside the newly created ticket
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setTitle(`Welcome to your ticket, ${member.user.username}!`)
            .setDescription('Please explain your issue in detail here. A staff member will be with you shortly.\n\nTo close this ticket, click the button below.')
            .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: `${member}, welcome!`, embeds: [welcomeEmbed], components: [closeRow] });

        // Let the user know their ticket was created
        await interaction.editReply({ content: `Your ticket has been created: ${ticketChannel}`, ephemeral: true });
    }

    // Handling the close button inside the ticket
    if (interaction.customId === 'close_ticket') {
        await interaction.reply({ content: 'Closing this ticket in 5 seconds...' });
        
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.error('Failed to delete channel:', err);
            }
        }, 5000);
    }
});

client.login('YOUR_BOT_TOKEN_HERE');
          
