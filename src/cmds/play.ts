import ms from "ms-plus";
import { Channel, Message } from "revkit";
import { QueueManager } from "..";
import Command from "../Command";
import { getUserSettings } from "../Settings";
import config from "../config";
import { Track } from "../music/Queue";
import { Filters } from "../music/filters";
import searchTrack, { SearchProviderAliases, SearchProviders } from "../music/search";
import { musicFooter, shuffle } from "../music/util";

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
        "--mix": {
          description: "Mixes the playlist into the queue. (every other song)",
          aliases: [],
        },
        "--playlist": {
          description: "Search the provider for playlists instead of tracks.",
          aliases: ["--pl"],
        },
        "--prepend": {
          description: "Adds the song to the beginning of the queue.",
          aliases: ["--pre", "--first"],
        },
        "--shuffle": {
          description: "Shuffles the playlist before queueing it. (playlist only)",
          aliases: ["--sh"],
        },
        "--skip": {
          description: "Skips to the queued song after adding it. Best paired with --prepend.",
          aliases: ["--sk"],
        },
        "-channel": {
          description: "The channel to play music in",
          aliases: ["-c"],
        },
        "-speed": {
          description: "The speed to play this song at. (0.5x-2x)",
          aliases: ["-s", "-spd"],
          arg: "[speed]",
        },
        "-use": {
          description:
            "The search provider to use. (default is just youtube, you can use shorter names like yt/sc)\nCan be one of: " +
            Object.values(SearchProviders)
              .map((p) => `\`${p}\``)
              .join(", "),
          aliases: ["-u", "-provider"],
          arg: `[${Object.values(SearchProviders).join("/")}]`,
        },
      }
    ),
    aliases: ["p"],
    args: ["<query>"],
  },
  async (bot, message, args) => {
    if (!message.channel.isServerBased()) return;
    let queue = QueueManager.getServerQueue(message.channel.server);

    if (!queue) {
      const matchChannel = (txt: string) => {
        if (!txt || !message.channel.isServerBased()) return null;
        const matchedPing = txt.match(/<#([A-z0-9]{26})>/);
        if (matchedPing)
          return message.channel.server.channels.find((c) => c.id == matchedPing[1]) || null;
        return (
          message.channel.server.channels.find(
            (c) => c.isVoice() && c.name.toLowerCase().includes(txt.toLowerCase())
          ) || null
        );
      };
      const specifiedChannel = args.hasFlag("channel");
      const context = specifiedChannel
        ? message
        : await message.reply("Send the name of a channel (or mention it) to play in!", true);
      const useChannel = specifiedChannel
        ? matchChannel(args.flag("channel"))
        : await new Promise<Channel | null>((res) => {
            const handler = (m: Message) => {
              if (m.authorID !== message.authorID || m.channelID !== message.channelID) return;
              bot.off("message", handler);
              return res(matchChannel(m.content));
            };
            bot.on("message", handler);
            setTimeout(() => {
              bot.off("message", handler);
              res(null);
            }, 20000);
          });
      if (!useChannel || !useChannel.isVoice())
        return context.reply("That's not a valid voice channel or you took too long to answer.");
      queue = QueueManager.getQueue(useChannel, message.channel);
    }

    const audioAttachment = message.attachments?.find((a) => a.metadata.type == "Audio");
    const query = audioAttachment
      ? `https://autumn.revolt.chat/attachments/${
          audioAttachment.id
        }?__filename=${encodeURIComponent(audioAttachment.name)}`
      : args.asString();
    if (!query) return message.reply("You need to enter a URL or search query!");

    const foundData = await searchTrack(
      query,
      <SearchProviders>(
        (Object.entries(SearchProviderAliases).find((e) => e[1].includes(args.flag("use")))?.[0] ||
          args.flag("use") ||
          getUserSettings(message.author).provider)
      ),
      message.author,
      args.bflag("playlist")
    );
    if (typeof foundData == "string") return message.reply(foundData);
    if (!foundData) return message.reply("No results found for that search!");

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
    const playbackSpeed = Math.min(
      2,
      Math.max(0.5, Math.round((Number(args.flag("speed")) || 1) * 10) / 10)
    );
    const filtersEnabled = [];
    Object.entries(Filters).forEach(
      ([id, detail]) => args.bflag(detail.id) && filtersEnabled.push(Number(id))
    );
    if (message.authorID == config.owner && args.hasFlag("args"))
      filtersEnabled.push(args.flag("args"));

    const useList: Track = Array.isArray(foundData)
      ? { ...foundData.shift(), filtersEnabled, playbackSpeed }
      : null;
    let firstSong: Track;
    const shouldSkip = args.bflag("skip") && queue.nowPlaying;

    const trackList = Array.isArray(foundData)
      ? args.bflag("shuffle")
        ? shuffle(foundData) // doesnt really matter for shuffling
        : args.bflag("prepend") // reverse order if prepending to queue
        ? [...foundData].reverse()
        : foundData
      : [foundData];
    for (const track of trackList) {
      const s = await queue.addSong(
        {
          ...track,
          filtersEnabled,
          playbackSpeed,
        },
        args.bflag("mix")
          ? trackList.indexOf(track) * 2 + (args.bflag("prepend") ? 0 : 1)
          : args.bflag("prepend")
          ? 0
          : -1
      );
      if (!firstSong) firstSong = s;
    }
    const track = Array.isArray(foundData)
      ? useList
      : {
          ...foundData,
          filtersEnabled,
          playbackSpeed,
        };

    if (shouldSkip) await queue.skipTo(queue.songs.indexOf(firstSong));

    await reply.edit({
      embeds: [
        {
          description: `#### Added${Array.isArray(foundData) ? " Playlist" : ""} [${track.title}](${
            track.url
          })${
            Array.isArray(foundData)
              ? ` with ${foundData.length} song${foundData.length == 1 ? "" : "s"}`
              : ""
          } to the queue.
by [${track.authorName}](${track.authorURL})

:alarm_clock: ${
            track.duration
              ? ms(track.duration).drop(1).toString() +
                (queue.playbackSpeed(track) !== 1
                  ? ` (${ms(track.duration / queue.playbackSpeed(track))
                      .drop(1)
                      .toString()} @ ${queue.playbackSpeed(track).toFixed(1)}x)`
                  : "")
              : "Live"
          }
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
${track.filtersEnabled.map((f) => `\`${typeof f == "string" ? f : Filters[f].name}\``).join(", ")}`
              : ""
          }

${musicFooter([`Requested by <@${message.author.id}>`])}`,
          colour: config.brandColor,
        },
      ],
    });
  }
);
