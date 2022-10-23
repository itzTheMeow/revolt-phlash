import Command from "../Command";
import Search from "youtube-sr";
import config from "../config";
import { QueueManager } from "..";
import { Channel, Message } from "revolt.js";
import { rawToTrack, youtubeToTrack } from "../music/converters";
import { msToString } from "revolt-toolset";
import { Filters } from "../music/filters";
import { Track } from "../music/Queue";
import { URL } from "url";
import { musicFooter } from "../music/util";

export default new Command(
  "play",
  {
    description: "Plays a song from youtube in your channel.",
    flags: Object.values(Filters).reduce(
      (prev, f) => {
        prev[`--${f.id}`] = {
          description: `Enables the ${f.name} filter for this query.`,
          aliases: f.aliases.map((a) => `--${a}`),
        };
        return prev;
      },
      {
        "-channel": { description: "The channel to play music in", aliases: ["-c"] },
        "-speed": {
          description: "The speed to play this song at. (0.5x-2x)",
          aliases: ["-s", "-spd"],
        },
      }
    ),
  },
  async (bot, message, args) => {
    let queue = QueueManager.getServerQueue(message.channel.server);

    if (!queue) {
      const matchChannel = (txt: string) => {
        if (!txt) return null;
        const matchedPing = txt.match(/<#([A-z0-9]{26})>/);
        if (matchedPing)
          return message.channel.server.channels.find((c) => c._id == matchedPing[1]) || null;
        return (
          message.channel.server.channels.find(
            (c) =>
              c.channel_type == "VoiceChannel" && c.name.toLowerCase().includes(txt.toLowerCase())
          ) || null
        );
      };
      const specifiedChannel = args.hasFlag("channel");
      const context = specifiedChannel
        ? message
        : await message.reply("Send the name of a channel (or mention it) to play in!");
      const useChannel = specifiedChannel
        ? matchChannel(args.flag("channel"))
        : await new Promise<Channel | null>((res) => {
            const handler = (m: Message) => {
              if (m.author_id !== message.author_id || m.channel_id !== message.channel_id) return;
              bot.off("message", handler);
              return res(matchChannel(m.content));
            };
            bot.on("message", handler);
            setTimeout(() => {
              bot.off("message", handler);
              res(null);
            }, 20000);
          });
      if (!useChannel || useChannel.channel_type !== "VoiceChannel")
        return context.reply(
          "That's not a valid voice channel or you took too long to answer.",
          false
        );
      queue = QueueManager.getQueue(useChannel, message.channel);
    }

    const audioAttachment = message.attachments?.filter((a) => a.metadata.type == "Audio")[0];
    const query = audioAttachment
      ? `https://autumn.revolt.chat/attachments/${
          audioAttachment._id
        }?__filename=${encodeURIComponent(audioAttachment.filename)}`
      : args.asString();
    if (!query) return message.reply("You need to enter a URL or search query!", false);

    const foundData = await (async () => {
      if (Search.validate(query, "VIDEO") || Search.validate(query, "VIDEO_ID")) {
        return youtubeToTrack(await Search.getVideo(query));
      } else if (
        (() => {
          try {
            new URL(query);
            return true;
          } catch {
            return false;
          }
        })()
      ) {
        return rawToTrack(new URL(query));
      } else {
        return youtubeToTrack(await Search.searchOne(query, "video"));
      }
    })();
    if (!foundData) return message.reply("No results found for that search!", false);

    const reply = await message.reply(
      {
        embeds: [
          {
            description: `:${config.emojis.loading}: Queueing...`,
            colour: config.brandColor,
          },
        ],
      },
      false
    );

    await queue.connect();
    const track: Track = {
      ...foundData,
      filtersEnabled: [],
      playbackSpeed: Math.min(
        2,
        Math.max(0.5, Math.round((Number(args.flag("speed")) || 1) * 10) / 10)
      ),
    };
    Object.entries(Filters).forEach(
      ([id, detail]) => args.bflag(detail.id) && track.filtersEnabled.push(Number(id))
    );
    if (message.author_id == config.owner && args.hasFlag("args"))
      track.filtersEnabled.push(args.flag("args"));
    await queue.addSong(track);

    await reply.edit({
      embeds: [
        {
          description: `#### Added [${track.title}](${track.url}) to the queue.
by [${track.authorName}](${track.authorURL})

:alarm_clock: ${msToString(track.duration)}
:eye: ${track.views.toLocaleString()}
:timer_clock: ${track.createdTime}${
            track.playbackSpeed !== 1
              ? ` ${
                  track.playbackSpeed > 1 ? ":fast_forward:" : ":rewind:"
                } ${track.playbackSpeed.toFixed(1)}x`
              : ""
          }${
            track.filtersEnabled.length
              ? `
**Filters**
${track.filtersEnabled.map((f) => `\`${Filters[f].name}\``).join(", ")}`
              : ""
          }

${musicFooter([`Requested by <@${message.author._id}>`])}`,
          colour: config.brandColor,
        },
      ],
    });
  }
);
