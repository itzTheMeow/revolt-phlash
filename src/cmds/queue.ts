import { msToString } from "revolt-toolset";
import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";
import { Track } from "../music/Queue";
import { musicFooter } from "../music/util";

export default new Command(
  "queue",
  {
    description: "View the server queue.",
    aliases: ["q"],
  },
  (bot, message) => {
    if (!message.channel.isServerBased()) return;
    const queue = QueueManager.getServerQueue(message.channel.server);

    if (!queue) return message.reply("There is nothing in the queue!", false);

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
            const emoji = [...String(i + 1).padStart(String(totalSongs).length, "0")]
              .map((c) => `:${config.emojis.num[c]}:`)
              .join("");
            if (t == queue.nowPlaying)
              return `### Now Playing
${emoji} **[${t.title}](${t.url})** by [${t.authorName}](${t.authorURL})
:alarm_clock: ${
                t.duration
                  ? `${msToString(queue.seek)}/${msToString(t.duration * queue.playbackSpeed())}${
                      queue.playbackSpeed() !== 1 ? ` (${queue.playbackSpeed().toFixed(1)}x)` : ""
                    }`
                  : "Live"
              } :eye: ${t.views.toLocaleString()} :timer_clock: ${t.createdTime}\n`;
            else
              return `#### ${emoji} **[${t.title}](${t.url})**
##### by [${t.authorName}](${t.authorURL})
##### :alarm_clock: ${msToString(t.duration)} :timer_clock: ${t.createdTime}`;
          })
          .join("\n") +
        `\n\n${musicFooter([
          `${totalSongs.toLocaleString()} total song${totalSongs == 1 ? "" : "s"} `,
        ])}`
      );
    }

    message.reply({
      embeds: [
        {
          description: getPage(0),
          colour: config.brandColor,
        },
      ],
    });
  }
);
