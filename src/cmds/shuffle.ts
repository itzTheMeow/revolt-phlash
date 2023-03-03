import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";

export default new Command(
  "shuffle",
  {
    description: "Shuffles the queue.",
    aliases: ["sh"],
    flags: {
      "--keep": {
        description: "Keep the first queued song in its position.",
      },
    },
  },
  async (bot, message, args) => {
    if (!message.channel.isServerBased()) return;
    const queue = QueueManager.getServerQueue(message.channel.server);
    if (!queue) return message.react(config.emojis.redTick);

    queue.shuffle(args.bflag("keep"));

    message.reply("Shuffled the queue. :ok_hand:");
  }
);
