// ===============================
// GIVEAWAY COMMAND
// ===============================

if (command === "giveaway") {

  const args = message.content
    .slice("$giveaway".length)
    .trim()
    .split(/ +/);

  const duration = args[0];
  const prize = args.slice(1).join(" ");

  if (!duration || !prize) {
    return message.reply(
      "❌ Usage: `$giveaway <time> <prize>`\n" +
      "Example: `$giveaway 10m Nitro`"
    );
  }

  const time = parseTime(duration);

  if (!time) {
    return message.reply(
      "❌ Invalid time!\n" +
      "Use `10s`, `10m`, `1h`, or `1d`."
    );
  }

  const endTime = Date.now() + time;

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(
      `🎁 **Prize:** ${prize}\n\n` +
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
      return message.channel.send("❌ Nobody entered the giveaway.");
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

    const winner =
      participants.random();

    const endedEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("🎊 GIVEAWAY ENDED 🎊")
      .setDescription(
        `🎁 **Prize:** ${prize}\n\n` +
        `🏆 **Winner:** ${winner}\n\n` +
        `Congratulations! 🎉`
      )
      .setFooter({
        text: "Giveaway ended"
      });

    await giveaway.edit({
      embeds: [endedEmbed]
    });

    await message.channel.send(
      `🎉 Congratulations ${winner}! You won **${prize}**!`
    );

  }, time);
}

// ===============================
// TIME FUNCTION
// ===============================

function parseTime(time) {

  const match = time.match(/^(\d+)(s|m|h|d)$/i);

  if (!match) return null;

  const number = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return number * units[unit];
}
