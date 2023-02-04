import { Channel, Message, msToString } from "revolt-toolset";
import { Util as SoundCloudUtils } from "soundcloud-scraper";
import SCClient from "soundcloud.ts";
import { URL } from "url";
import Search from "youtube-sr";
import { QueueManager } from "..";
import Command from "../Command";
import config from "../config";
import {
  CustomTrack,
  rawToTrack,
  soundcloudListToTrack,
  soundcloudToTrack,
  youtubeListToTrack,
  youtubeToTrack,
} from "../music/converters";
import { Filters } from "../music/filters";
import { getPlexServers, searchPlexSong } from "../music/IntegrationPlex";
import { getTuneinTrack } from "../music/IntegrationTuneIn";
import { Track } from "../music/Queue";
import { musicFooter } from "../music/util";
import { getUserSettings } from "../Settings";

const SoundCloud = new SCClient();

enum SearchProviders {
  YouTube = "youtube",
  SoundCloud = "soundcloud",
  TuneIn = "tunein",
  Plex = "plex",
}
const SearchProviderAliases: { [key in SearchProviders]: string[] } = {
  youtube: ["yt", "y"],
  soundcloud: ["sc", "s", "cloud"],
  tunein: ["radio", "t"],
  plex: ["p"],
};

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
        : await message.reply("Send the name of a channel (or mention it) to play in!");
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
        return context.reply(
          "That's not a valid voice channel or you took too long to answer.",
          false
        );
      queue = QueueManager.getQueue(useChannel, message.channel);
    }

    const audioAttachment = message.attachments?.find((a) => a.metadata.type == "Audio");
    const query = audioAttachment
      ? `https://autumn.revolt.chat/attachments/${
          audioAttachment.id
        }?__filename=${encodeURIComponent(audioAttachment.name)}`
      : args.asString();
    if (!query) return message.reply("You need to enter a URL or search query!", false);

    const foundData: CustomTrack | CustomTrack[] = await (async () => {
      const useProvider =
        Object.entries(SearchProviderAliases).find((e) => e[1].includes(args.flag("use")))?.[0] ||
        args.flag("use");
      if (useProvider.startsWith(SearchProviders.Plex)) {
        const prefs = getUserSettings(message.author);
        if (!prefs.plexKey || !prefs.plexServer)
          return (
            message.reply("You need to link your plex account with the settings command!"), null
          );
        const server = (await getPlexServers(prefs.plexKey)).find((s) => s.id == prefs.plexServer);
        if (!server) return message.reply("Failed to get plex server. Try re-linking?"), null;
        return await searchPlexSong(
          prefs.plexKey,
          server,
          query,
          useProvider.replace(SearchProviders.Plex + ":", "").trim()
        );
      } else if (useProvider == SearchProviders.TuneIn) {
        return await getTuneinTrack(query);
      } else if (useProvider == "soundcloud") {
        return soundcloudToTrack(
          (
            await SoundCloud.tracks.searchV2({
              q: query,
              limit: 1,
            })
          )?.collection?.[0]
        );
      } else if (Search.validate(query, "PLAYLIST")) {
        const list = await Search.getPlaylist(query);
        if (!list) return null;
        return [
          youtubeListToTrack(list),
          ...(await Promise.all(list.videos.map(async (v) => await Search.getVideo(v.url)))).map(
            youtubeToTrack
          ),
        ];
      } else if (Search.validate(query, "VIDEO")) {
        return youtubeToTrack(await Search.getVideo(query));
      } else if (SoundCloudUtils.validateURL(query, "track")) {
        return soundcloudToTrack(await SoundCloud.tracks.getV2(query));
      } else if (SoundCloudUtils.validateURL(query, "playlist")) {
        const list = await SoundCloud.playlists.getV2(query);
        if (!list) return null;
        return [soundcloudListToTrack(list), ...list.tracks.map(soundcloudToTrack)];
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
    for (const track of Array.isArray(foundData) ? foundData : [foundData]) {
      await queue.addSong({
        ...track,
        filtersEnabled,
        playbackSpeed,
      });
    }
    const track = Array.isArray(foundData)
      ? useList
      : {
          ...foundData,
          filtersEnabled,
          playbackSpeed,
        };

    if (!reply.isUser()) return;
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
              ? msToString(track.duration, { noMs: true }) +
                (queue.playbackSpeed(track) !== 1
                  ? ` (${msToString(track.duration / queue.playbackSpeed(track), {
                      noMs: true,
                    })} @ ${queue.playbackSpeed(track).toFixed(1)}x)`
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
