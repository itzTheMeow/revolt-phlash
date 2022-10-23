import { define } from "urban-dictionary";
import Command from "../Command";
import config from "../config";

export default new Command(
  "urban",
  {
    description: "Gets the definition for a term from Urban Dictionary.",
  },
  async (bot, message, args) => {
    const searchTerm = args.asString();

    if (!searchTerm) return message.reply("Specify something to define!");

    const defs = await define(searchTerm);
    if (!defs.length) return message.reply("No definitions found.");

    const def = defs[0];

    message.reply({
      embeds: [
        {
          description: `#### ${def.word}

${def.definition}`,
          colour: config.brandColor,
        },
      ],
    });
  }
);
