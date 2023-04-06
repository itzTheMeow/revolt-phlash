import { msToString } from "revkit";
import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";
import { DumpedQueue, Track } from "../music/Queue";
import { musicFooter } from "../music/util";

const FrozenQueues: Record<string, DumpedQueue> = {};

export default new Command(
  "queue",
  {
    description:
      "View the server queue.\nCommands:\nUse a number to view a specific page.\n`freeze` - Freezes the queue allowing you to restore it later. (tied to your user)\n`restore` - Restores the frozen queue.",
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

    if (!queue) return message.reply("There is nothing in the queue!", false);

    if (args.number(1) || !command) {
      const totalSongs = queue.songs.length + Number(!!queue.nowPlaying);

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
              const emoji = [...String(num * PER_PAGE + i + 1)]
                .map((c) => `:${config.emojis.num[c]}:`)
                .join("");
              if (t == queue.nowPlaying)
                return `### Now Playing
${emoji} **[${t.title}](${t.url})** by [${t.authorName}](${t.authorURL})
:alarm_clock: ${
                  t.duration
                    ? `${msToString(queue.seek, { noMs: true })}/${msToString(
                        t.duration / queue.playbackSpeed(),
                        { noMs: true }
                      )}${
                        queue.playbackSpeed() !== 1 ? ` (${queue.playbackSpeed().toFixed(1)}x)` : ""
                      }`
                    : "Live"
                } :eye: ${t.views.toLocaleString()} :timer_clock: ${t.createdTime}\n`;
              else
                return `#### ${emoji} **[${t.title}](${t.url})**
##### by [${t.authorName}](${
                  t.authorURL.startsWith("https://app.plex.tv") ? "https://plex.tv" : t.authorURL
                })
##### :alarm_clock: ${msToString(t.duration)} :timer_clock: ${t.createdTime}`;
            })
            .join("\n") +
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
