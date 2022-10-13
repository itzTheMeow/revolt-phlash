import Command from "../Command";
import Search from "youtube-sr";
import config from "../config";
import { QueueManager } from "..";
import { Channel, Message } from "revolt.js";
import { exec } from "youtube-dl-exec";
import { RevoiceState } from "revoice-ts";

export default new Command(
  "play",
  {
    description: "Plays a song from youtube in your channel.",
    flags: { "-channel": { description: "The channel to play music in", aliases: ["-c"] } },
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

    const query = args.asString();
    if (!query) return message.reply("You need to enter a URL or search query!", false);

    const searched =
      Search.validate(query, "VIDEO") || Search.validate(query, "VIDEO_ID")
        ? await Search.getVideo(query)
        : await Search.searchOne(query, "video");

    if (!searched) return message.reply("No results found for that search!", false);

    const reply = await message.reply({ content: `:${config.emojis.loading}: Queueing...` }, false);

    await queue.connect();

    const stream = exec(searched.url, {
      format: "bestaudio",
      output: "-",
    }).stdout;

    if (queue.connection.state == RevoiceState.PLAYING) await queue.player.stop();
    await queue.player.playStream(stream);

    await reply.edit({
      content: "[]()",
      embeds: [
        {
          description: `#### Added [${searched.title}](${searched.url}) to the queue.
by [${searched.channel.name}](${searched.channel.url})
:alarm_clock: ${searched.durationFormatted} :eye: ${searched.views.toLocaleString()}

##### :${config.emojis.discspin}: PHLASH Music &bull; Requested by <@${message.author._id}>`,
          colour: config.brandColor,
        },
      ],
    });
  }
);
