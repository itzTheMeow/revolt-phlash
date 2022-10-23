import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";

export default new Command(
  "stop",
  { description: "Stops playing music.", aliases: ["leave", "fuckoff"] },
  async (bot, message, args) => {
    const queue = QueueManager.getServerQueue(message.channel.server);
    if (!queue) return message.react(config.emojis.redTick);

    await queue.destroy();
    message.react(config.emojis.greenTick);
  }
);
