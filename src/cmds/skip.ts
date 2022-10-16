import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";

export default new Command(
  "skip",
  { description: "Skips the current song." },
  async (bot, message, args) => {
    const queue = QueueManager.getServerQueue(message.channel.server);
    if (!queue) return message.react(config.emojis.redTick);

    //await queue.player.stop();
    await queue.player.ffmpegFinished(true);
    message.react(config.emojis.greenTick);
  }
);
