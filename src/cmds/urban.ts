import define from "urban-eng-dictionary";
import Command from "../Command";
import config from "../config";

export default new Command(
  "urban",
  {
    description: "Gets the definition for a term from Urban Dictionary.",
    aliases: ["urbandictionary"],
    args: ["[term]"],
  },
  async (bot, message, args) => {
    const searchTerm = args.asString();
    if (!searchTerm) return message.reply("Specify something to define!");

    const defs: string[] = await (async () => {
      try {
        return await define(searchTerm);
      } catch {
        return [];
      }
    })();
    if (!defs.length) return message.reply("No definitions found.");

    const def = defs[0];

    message.reply({
      embeds: [
        {
          description: `#### ${searchTerm}
${def}`,
          /*`
##### :thumbsup: ${def.thumbs_up.toLocaleString()} :thumbsdown: ${def.thumbs_down.toLocaleString()}
##### by ${def.author} on &nbsp;${getMarkdownTimestamp(
            new Date(def.written_on).getTime(),
            MarkdownTimestampTypes["22 September 2022"]
          )}`*/ colour: config.brandColor,
        },
      ],
    });
  }
);
