// ===============================
// BALANCE SYSTEM
// ===============================

const balances = new Map();

// $balance
if (command === "balance") {
  const userId = message.author.id;

  if (!balances.has(userId)) {
    balances.set(userId, 1000);
  }

  const balance = balances.get(userId);

  return message.reply(
    `💰 **${message.author.username}'s Balance**\n\n` +
    `🪙 **${balance.toLocaleString()} coins**`
  );
}

// $bal
if (command === "bal") {
  const userId = message.author.id;

  if (!balances.has(userId)) {
    balances.set(userId, 1000);
  }

  const balance = balances.get(userId);

  return message.reply(
    `💰 **Balance:** ${balance.toLocaleString()} 🪙`
  );
}
    

