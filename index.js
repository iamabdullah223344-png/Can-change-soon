if (command === "giveaway") {

  const duration = args[0];
  const winners = parseInt(args[1]);
  const prize = args.slice(2).join(" ");

  if (!duration || !winners || !prize) {
    return message.reply(
      "❌ Usage: `$giveaway <time> <winners> <prize>`\n" +
      "Example: `$giveaway 10m 1 Nitro`"
    );
  }

  const time = parseDuration(duration);

  if (!time) {
    return message.reply(
      "❌ Invalid time! Use `10s`, `10m`, `1h`, or `1d`."
    );
  }

  const endTime = Date.now() + time;

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎉・GIVEAWAY")
    .setDescription(
      `🎁 **Prize:** ${prize}\n\n` +
      `🏆 **Winners:** ${winners}\n` +
      `⏰ **Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
      `React with 🎉 to enter!\n\n` +
      `👑 **Hosted by:** ${message.author}`
    )
    .setFooter({
      text: "Good luck everyone! 🍀"
    });

  const giveaway = await message.channel.send({
    embeds: [embed]
  });

  await giveaway.react("🎉");

  setTimeout(async () => {

    const reaction = giveaway.reactions.cache.get("🎉");

    if (!reaction) {
      return message.channel.send("❌ Nobody entered.");
    }

    const users = await reaction.users.fetch();

    const participants = users.filter(
      user => !user.bot
    );

    if (participants.size === 0) {
      return message.channel.send(
        "❌ Nobody entered the giveaway."
      );
    }

    const selected = [];

    for (
      let i = 0;
      i < winners && participants.size > 0;
      i++
    ) {
      const winner = participants.random();
      selected.push(winner);
      participants.delete(winner.id);
    }

    const winnerText = selected
      .map(user => `${user}`)
      .join(", ");

    const endedEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("🎊・GIVEAWAY ENDED")
      .setDescription(
        `🎁 **Prize:** ${prize}\n\n` +
        `🏆 **Winner${selected.length > 1 ? "s" : ""}:**\n` +
        `${winnerText}\n\n` +
        `🎉 Congratulations!`
      )
      .setFooter({
        text: "Giveaway ended"
      });

    await giveaway.edit({
      embeds: [endedEmbed]
    });

    await message.channel.send(
      `🎉 Congratulations ${winnerText}! You won **${prize}**!`
    );

  }, time);
}


// TIME FUNCTION

function parseDuration(duration) {

  const match = duration.match(
    /^(\d+)(s|m|h|d)$/i
  );

  if (!match) return null;

  const number = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const units = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  return number * units[unit];
}
