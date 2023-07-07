import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";
import { DumpedQueue, Track } from "../music/Queue";
import { nowPlayingText, songText } from "../music/text";
import { musicFooter } from "../music/util";

const FrozenQueues: Record<string, DumpedQueue> = {};

export default new Command(
  "queue",
  {
    description:
      "View the server queue.\nCommands:\nUse a number to view a specific page.\n`debug` - Shows debug information.\n`freeze` - Freezes the queue allowing you to restore it later. (tied to your user)\n`restore` - Restores the frozen queue.",
    aliases: ["q"],
    args: ["<command>"],
  },
  async (bot, message, args) => {
    if (!message.channel.isServerBased()) return;
    const command = <"freeze" | "restore">args.string(1);
    const queue = QueueManager.getServerQueue(message.channel.server);

    if (command == "restore") {
      const q = FrozenQueues[message.authorID];
      if (!q) return message.reply("There is no saved queue to restore!");
      await QueueManager.getQueue(q.channel, message.channel).restore(q);
      message.reply(`Restored the queue to <#${q.channel.id}>!`);
      return;
    }
    if (command == "debug") {
      if (!queue) {
        message.reply("Nothing playing.");
      } else {
        message.reply({
          embeds: [{
            title: "Music Player Debug",
            description: `Stream URL: ${queue.nowPlaying?.url || "N/A"}`,
            colour: config.brandColor,
          }] 
        });
      }
      return;
    }

    if (!queue) return message.reply("There is nothing in the queue!", false);

    if (args.number(1) || !command) {
      const totalSongs = queue.songs.length;

      const PER_PAGE = 5;
      const pages: Track[][] = queue.nowPlaying ? [[queue.nowPlaying]] : [];
      queue.songs.forEach((s) => {
        let page = pages[pages.length - 1];
        if (!page || page.length >= PER_PAGE) page = pages[pages.push([]) - 1];
        page.push(s);
      });

      function getPage(num: number) {
        return (
          pages[num]
            ?.map((t, i) => {
              const index = num * PER_PAGE + i;
              if (t == queue.nowPlaying)
                return `### Now Playing\n${nowPlayingText(queue, t)}\n###### \u200b`;
              else return songText(queue, t, index);
            })
            .join("\n###### \u200b\n") +
          `\n\n${musicFooter([
            `${totalSongs.toLocaleString()} total song${totalSongs == 1 ? "" : "s"} `,
          ])}`
        );
      }

      let num = args.number(1) || 1;
      if (num <= 0) num = 1;
      if (num > pages.length) num = pages.length;
      if (!pages[num - 1]) num = 1;
      message.reply({
        embeds: [
          {
            description: getPage(num - 1) || "Nothing in the queue.",
            colour: config.brandColor,
          },
        ],
      });
    }

    switch (command) {
      case "freeze": {
        FrozenQueues[message.authorID] = queue.dump();
        message.reply("Saved the queue in memory.");
        break;
      }
    }
  }
);
