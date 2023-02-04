import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";

export default new Command(
  "stop",
  { description: "Stops playing music.", aliases: ["leave", "fuckoff", "stp"] },
  async (bot, message, args) => {
    if (!message.channel.isServerBased()) return;
    const queue = QueueManager.getServerQueue(message.channel.server);
    if (!queue) return message.react(config.emojis.redTick);

    await queue.destroy();
    message.react(config.emojis.greenTick);
  }
);
