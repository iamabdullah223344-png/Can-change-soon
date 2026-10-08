client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // PING
  if (message.content.toLowerCase() === "$ping") {
    return message.reply("🏓 Pong! I'm working!");
  }

  // GIVEAWAY
  // Put the giveaway code here
});
