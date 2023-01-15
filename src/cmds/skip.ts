import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";

export default new Command(
  "skip",
  { description: "Skips the current song.", aliases: ["s"] },
  async (bot, message, args) => {
    if (!message.channel.isServerBased()) return;
    const queue = QueueManager.getServerQueue(message.channel.server);
    if (!queue) return message.react(config.emojis.redTick);

    queue.freed = false;
    queue.player.disconnect(false, true);
    queue.freed = true;
    queue.onSongFinished();
    message.react(config.emojis.greenTick);
  }
);
