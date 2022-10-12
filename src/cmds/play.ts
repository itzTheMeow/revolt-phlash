import Command from "../Command";
import Search from "youtube-sr";
import config from "../config";
import { QueueManager } from "..";
import { Channel, Message } from "revolt.js";
import ytdl from "ytdl-core";
import { RevoiceState } from "revoice-ts";

export default new Command(
  "play",
  "Plays a song from youtube in your channel.",
  async (bot, message, args) => {
    let queue = QueueManager.getServerQueue(message.channel.server);

    if (!queue) {
      const context = await message.reply("Send the name of a channel (or mention it) to play in!");
      const useChannel = await new Promise<Channel | null>((res) => {
        const handler = (m: Message) => {
          if (m.author_id !== message.author_id || m.channel_id !== message.channel_id) return;
          const matchedPing = m.content.match(/<#([A-z0-9]{26})>/);
          bot.off("message", handler);
          if (matchedPing)
            return res(
              message.channel.server.channels.find((c) => c._id == matchedPing[1]) || null
            );
          return res(
            message.channel.server.channels.find(
              (c) =>
                c.channel_type == "VoiceChannel" &&
                c.name.toLowerCase().includes(m.content.toLowerCase())
            ) || null
          );
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

    const query = args.asString();
    if (!query) return message.reply("You need to enter a URL or search query!", false);

    const searched =
      Search.validate(query, "VIDEO") || Search.validate(query, "VIDEO_ID")
        ? await Search.getVideo(query)
        : await Search.searchOne(query, "video");

    if (!searched) return message.reply("No results found for that search!", false);

    await queue.connect();

    const stream = ytdl(searched.url, {
      quality: "highestaudio",
      highWaterMark: 1 << 26,
    });

    if (queue.connection.state == RevoiceState.PLAYING) await queue.player.stop();
    await queue.player.playStream(stream);

    await message.reply(
      {
        embeds: [
          {
            description: `#### Added [${searched.title}](${searched.url}) to the queue.
by [${searched.channel.name}](${searched.channel.url})
:alarm_clock: ${searched.durationFormatted} :eye: ${searched.views.toLocaleString()}

##### ${config.emojis.discspin} PHLASH Music &bull; Requested by <@${message.author._id}>`,
            colour: config.brandColor,
          },
        ],
      },
      false
    );
  }
);
