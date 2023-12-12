import { BaseMessage, Channel } from "revkit";

export default async function fetchMessages(channel: Channel, amount: number) {
  if (!channel.isTextBased()) return;
  let last = "";
  const messages: BaseMessage[] = [];
  while (amount > 0) {
    const msgs = await channel.messages.fetchMultiple({
      ...{ limit: Math.min(amount, 100) },
      ...(last ? { before: last } : {}),
    });
    amount -= 100;
    messages.push(...msgs.filter((m) => m.isUser()));
    last = (msgs[msgs.length - 1] || {}).id || "";
  }
  return messages;
}
