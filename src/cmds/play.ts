import Command from "../Command";
import Search from "youtube-sr";
import config from "../config";

export default new Command(
  "play",
  "Plays a song from youtube in your channel.",
  async (bot, message, args) => {
    const query = args.asString();
    if (!query) return message.reply("You need to enter a URL or search query!", false);

    const searched =
      Search.validate(query, "VIDEO") || Search.validate(query, "VIDEO_ID")
        ? await Search.getVideo(query)
        : await Search.searchOne(query, "video");

    if (!searched) return message.reply("No results found for that search!", false);

    message.reply(
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
