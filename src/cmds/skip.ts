import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";

export default new Command(
  "skip",
  {
    description: "Skips the current song. Optionally skip to a number in the queue.",
    aliases: ["s"],
    args: ["<index>"],
  },
  async (bot, message, args) => {
    if (!message.channel.isServerBased()) return;
    const queue = QueueManager.getServerQueue(message.channel.server);
    if (!queue) return message.react(config.emojis.redTick);

    const index = args.number(1),
      skipped = await queue.skipTo(Math.max(0, (index || 0) - 1));

    if (skipped.length) {
      message.reply(`Skipped past ${skipped.length} song${skipped.length > 1 ? "s" : ""}.`);
    } else message.react(config.emojis.greenTick);
  }
);
